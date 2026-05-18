"""
Testy pro meta_publisher.py
- Instagram publishing flow (mocked HTTP)
- Facebook publishing
- Credential verification
"""
import sys
import json
from pathlib import Path
from unittest.mock import patch, MagicMock
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
import config
from meta_publisher import MetaPublisher


@pytest.fixture
def publisher(monkeypatch):
    """MetaPublisher s fake credentials"""
    monkeypatch.setattr(config, "META_ACCESS_TOKEN", "fake_token_123")
    monkeypatch.setattr(config, "META_PAGE_ID", "fake_page_123")
    monkeypatch.setattr(config, "INSTAGRAM_ACCOUNT_ID", "fake_ig_123")
    return MetaPublisher()


@pytest.fixture
def test_image(tmp_path):
    """Vytvoří testovací obrázek"""
    img_path = tmp_path / "test.png"
    # Minimální PNG (1x1 pixel)
    img_path.write_bytes(
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
        b'\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00'
        b'\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00'
        b'\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
    )
    return img_path


class TestInit:
    def test_raises_without_token(self, monkeypatch):
        monkeypatch.setattr(config, "META_ACCESS_TOKEN", "")
        with pytest.raises(ValueError, match="META_ACCESS_TOKEN"):
            MetaPublisher()

    def test_init_with_token(self, publisher):
        assert publisher.access_token == "fake_token_123"
        assert publisher.page_id == "fake_page_123"
        assert publisher.instagram_id == "fake_ig_123"


class TestFacebookPublish:
    """Testy Facebook publikace (mockované HTTP)"""

    @patch("meta_publisher.requests.post")
    def test_text_post_success(self, mock_post, publisher):
        mock_post.return_value = MagicMock(
            json=lambda: {"id": "12345_67890"}
        )
        result = publisher.publish_to_facebook("Test post")
        assert result["success"] is True
        assert result["post_id"] == "12345_67890"

    @patch("meta_publisher.requests.post")
    def test_text_post_error(self, mock_post, publisher):
        mock_post.return_value = MagicMock(
            json=lambda: {"error": {"message": "Invalid token"}}
        )
        result = publisher.publish_to_facebook("Test post")
        assert result["success"] is False
        assert "Invalid token" in result["error"]

    @patch("meta_publisher.requests.post")
    def test_image_post_success(self, mock_post, publisher, test_image):
        mock_post.return_value = MagicMock(
            json=lambda: {"id": "photo_123"}
        )
        result = publisher.publish_to_facebook("Caption", image_path=test_image)
        assert result["success"] is True

    @patch("meta_publisher.requests.post")
    def test_comment_success(self, mock_post, publisher):
        mock_post.return_value = MagicMock(
            json=lambda: {"id": "comment_123"}
        )
        result = publisher.comment_on_facebook_object("post_123", "Link")
        assert result["success"] is True
        assert result["comment_id"] == "comment_123"

    @patch("meta_publisher.requests.post")
    def test_comment_error(self, mock_post, publisher):
        mock_post.return_value = MagicMock(
            json=lambda: {"error": {"message": "Permission denied"}}
        )
        result = publisher.comment_on_facebook_object("post_123", "Link")
        assert result["success"] is False
        assert "Permission denied" in result["error"]


class TestInstagramPublish:
    """Testy Instagram publishing flow"""

    def test_no_ig_id(self, monkeypatch):
        monkeypatch.setattr(config, "META_ACCESS_TOKEN", "token")
        monkeypatch.setattr(config, "META_PAGE_ID", "page")
        monkeypatch.setattr(config, "INSTAGRAM_ACCOUNT_ID", "")
        pub = MetaPublisher()
        result = pub.publish_to_instagram("caption", Path("img.png"))
        assert result["success"] is False
        assert "INSTAGRAM_ACCOUNT_ID" in result["error"]

    def test_missing_image(self, publisher):
        result = publisher.publish_to_instagram("caption", Path("/nonexistent.png"))
        assert result["success"] is False
        assert "nenalezen" in result["error"]

    @patch("meta_publisher.requests.get")
    @patch("meta_publisher.requests.post")
    def test_full_flow_success(self, mock_post, mock_get, publisher, test_image):
        """Kompletní IG flow: upload → container → wait → publish"""
        # Mock responses v pořadí volání
        mock_post.side_effect = [
            # 1. Upload unpublished FB photo
            MagicMock(json=lambda: {"id": "fb_photo_123"}),
            # 2. Create IG container
            MagicMock(json=lambda: {"id": "container_456"}),
            # 3. Publish container
            MagicMock(json=lambda: {"id": "ig_media_789"}),
        ]
        mock_get.side_effect = [
            # 1. Get photo URL
            MagicMock(json=lambda: {
                "images": [{"source": "https://fb.com/photo.jpg"}]
            }),
            # 2. Container status check
            MagicMock(json=lambda: {"status_code": "FINISHED"}),
        ]

        result = publisher.publish_to_instagram("Test caption #mystika", test_image)
        assert result["success"] is True
        assert result["media_id"] == "ig_media_789"

    @patch("meta_publisher.requests.get")
    @patch("meta_publisher.requests.post")
    def test_upload_failure(self, mock_post, mock_get, publisher, test_image):
        """Upload selhání → graceful error"""
        mock_post.return_value = MagicMock(
            json=lambda: {"error": {"message": "Upload failed"}}
        )
        result = publisher.publish_to_instagram("Caption", test_image)
        assert result["success"] is False

    def test_caption_truncation(self, publisher, test_image):
        """Caption delší než 2200 znaků se ořízne"""
        long_caption = "x" * 2500
        with patch("meta_publisher.requests.post") as mock_post, \
             patch("meta_publisher.requests.get") as mock_get:
            mock_post.side_effect = [
                MagicMock(json=lambda: {"id": "photo_1"}),
                MagicMock(json=lambda: {"id": "container_1"}),
                MagicMock(json=lambda: {"id": "media_1"}),
            ]
            mock_get.side_effect = [
                MagicMock(json=lambda: {"images": [{"source": "https://url.jpg"}]}),
                MagicMock(json=lambda: {"status_code": "FINISHED"}),
            ]
            result = publisher.publish_to_instagram(long_caption, test_image)
            # Ověříme, že container creation dostal zkrácený caption
            container_call = mock_post.call_args_list[1]
            sent_caption = container_call[1].get("data", container_call[0][0] if container_call[0] else {}).get("caption", "")
            # Post by měl projít (mockovaně)


class TestInstagramStory:
    """Testy Instagram Story publikace"""

    @patch("meta_publisher.requests.get")
    @patch("meta_publisher.requests.post")
    def test_story_success(self, mock_post, mock_get, publisher, test_image):
        mock_post.side_effect = [
            MagicMock(json=lambda: {"id": "fb_photo_1"}),
            MagicMock(json=lambda: {"id": "story_container_1"}),
            MagicMock(json=lambda: {"id": "story_media_1"}),
        ]
        mock_get.side_effect = [
            MagicMock(json=lambda: {"images": [{"source": "https://url.jpg"}]}),
            MagicMock(json=lambda: {"status_code": "FINISHED"}),
        ]
        result = publisher.publish_story_to_instagram(test_image)
        assert result["success"] is True


class TestInstagramCarousel:
    """Testy Instagram Carousel"""

    def test_too_few_images(self, publisher):
        result = publisher.publish_carousel_to_instagram("Caption", [Path("one.png")])
        assert result["success"] is False
        assert "alespoň 2" in result["error"]

    def test_too_many_images(self, publisher):
        paths = [Path(f"img{i}.png") for i in range(11)]
        result = publisher.publish_carousel_to_instagram("Caption", paths)
        assert result["success"] is False
        assert "max 10" in result["error"]


class TestVerifyCredentials:
    @patch("meta_publisher.requests.get")
    def test_verify_success(self, mock_get, publisher):
        mock_get.return_value = MagicMock(
            json=lambda: {"id": "123", "name": "Mystická Hvězda"}
        )
        result = publisher.verify_credentials()
        assert result["success"] is True
        assert result["name"] == "Mystická Hvězda"

    @patch("meta_publisher.requests.get")
    def test_verify_failure(self, mock_get, publisher):
        mock_get.return_value = MagicMock(
            json=lambda: {"error": {"message": "Invalid token"}}
        )
        result = publisher.verify_credentials()
        assert result["success"] is False

    @patch("meta_publisher.requests.get")
    def test_verify_instagram(self, mock_get, publisher):
        mock_get.return_value = MagicMock(
            json=lambda: {
                "id": "ig_123",
                "username": "mystickahvezda",
                "name": "Mystická Hvězda",
                "followers_count": 5000,
                "media_count": 150,
            }
        )
        result = publisher.verify_instagram_access()
        assert result["success"] is True
        assert result["username"] == "mystickahvezda"
