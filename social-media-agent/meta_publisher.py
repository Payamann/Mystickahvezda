"""
Meta Publisher — publikuje posty na Facebook a Instagram přes Graph API

Instagram flow:
  1. Nahraj obrázek jako nepublikovanou FB fotku → získáš veřejnou URL
  2. Vytvoř IG media container s touto URL
  3. Publikuj container

Stav: PŘIPRAVENO — čeká na META_ACCESS_TOKEN a META_PAGE_ID
"""
import requests
import io
import json
import time
from pathlib import Path
from datetime import datetime
import sys

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).parent))
import config
from logger import get_logger

log = get_logger(__name__)


class MetaPublisher:
    """Publikuje obsah na Facebook a Instagram přes Meta Graph API"""

    GRAPH_API_URL = config.GRAPH_API_URL

    def __init__(self):
        self.access_token = config.META_ACCESS_TOKEN
        self.page_id = config.META_PAGE_ID
        self.instagram_id = config.INSTAGRAM_ACCOUNT_ID

        if not self.access_token:
            raise ValueError(
                "META_ACCESS_TOKEN není nastaven.\n"
                "Navštiv: https://developers.facebook.com/\n"
                "Vytvoř App → Facebook Login → Získej Page Access Token"
            )

    # ══════════════════════════════════════════════════
    # FACEBOOK
    # ══════════════════════════════════════════════════

    def publish_to_facebook(
        self,
        message: str,
        image_path: Path = None,
        link: str = None,
    ) -> dict:
        """
        Publikuje post na Facebook stránku.

        Args:
            message: text postu (caption + hashtags)
            image_path: cesta k obrázku (volitelné)
            link: URL odkaz (volitelné)

        Returns:
            dict: {'success': bool, 'post_id': str, 'error': str}
        """
        if image_path and Path(image_path).exists():
            return self._publish_with_image_facebook(message, image_path)
        else:
            return self._publish_text_facebook(message, link)

    def _publish_text_facebook(self, message: str, link: str = None) -> dict:
        """Publikuje textový post na Facebook"""
        url = f"{self.GRAPH_API_URL}/{self.page_id}/feed"
        data = {
            "message": message,
            "access_token": self.access_token,
        }
        if link:
            data["link"] = link

        log.info("Publikuji textový post na Facebook...")
        response = requests.post(url, data=data, timeout=config.HTTP_TIMEOUT)
        result = response.json()

        if "id" in result:
            log.info("Facebook post publikován: %s", result["id"])
            return {"success": True, "post_id": result["id"]}
        else:
            error = result.get("error", {}).get("message", str(result))
            log.error("Facebook publikace selhala: %s", error)
            return {"success": False, "error": error}

    def _publish_with_image_facebook(self, message: str, image_path: Path) -> dict:
        """Nahraje obrázek a publikuje post na Facebook"""
        upload_url = f"{self.GRAPH_API_URL}/{self.page_id}/photos"

        log.info("Nahrávám obrázek na Facebook: %s", image_path)
        with open(image_path, 'rb') as f:
            files = {"source": f}
            data = {
                "caption": message,
                "access_token": self.access_token,
            }
            response = requests.post(upload_url, files=files, data=data, timeout=config.HTTP_TIMEOUT)

        result = response.json()
        if "id" in result:
            log.info("Facebook foto post publikován: %s", result["id"])
            return {"success": True, "post_id": result["id"]}
        else:
            error = result.get("error", {}).get("message", str(result))
            log.error("Facebook foto publikace selhala: %s", error)
            return {"success": False, "error": error}

    def comment_on_facebook_object(self, object_id: str, message: str) -> dict:
        """Přidá komentář k Facebook postu nebo fotce."""
        url = f"{self.GRAPH_API_URL}/{object_id}/comments"
        data = {
            "message": message,
            "access_token": self.access_token,
        }
        response = requests.post(url, data=data, timeout=config.HTTP_TIMEOUT)
        result = response.json()

        if "id" in result:
            log.info("Facebook komentář přidán: %s", result["id"])
            return {"success": True, "comment_id": result["id"]}

        error = result.get("error", {}).get("message", str(result))
        log.error("Facebook komentář selhal: %s", error)
        return {"success": False, "error": error}

    # ══════════════════════════════════════════════════
    # INSTAGRAM
    # ══════════════════════════════════════════════════

    def _upload_image_to_facebook_unpublished(self, image_path: Path) -> str | None:
        """
        Nahraje obrázek jako nepublikovanou Facebook fotku.
        Vrátí veřejnou URL obrázku (potřebnou pro Instagram API).

        Instagram Graph API vyžaduje veřejně dostupnou URL.
        Trik: nahrajeme jako unpublished FB photo → získáme URL z Graph API.
        """
        upload_url = f"{self.GRAPH_API_URL}/{self.page_id}/photos"

        log.info("Nahrávám obrázek jako unpublished FB photo pro IG...")
        with open(image_path, 'rb') as f:
            files = {"source": f}
            data = {
                "published": "false",  # KLÍČ: nepublikovat na FB
                "access_token": self.access_token,
            }
            response = requests.post(upload_url, files=files, data=data, timeout=config.HTTP_TIMEOUT)

        result = response.json()
        if "id" not in result:
            error = result.get("error", {}).get("message", str(result))
            log.error("Upload unpublished photo selhal: %s", error)
            return None

        photo_id = result["id"]
        log.debug("Unpublished photo ID: %s", photo_id)

        # Získej veřejnou URL z photo objektu
        photo_url = f"{self.GRAPH_API_URL}/{photo_id}"
        photo_resp = requests.get(photo_url, params={
            "fields": "images",
            "access_token": self.access_token,
        }, timeout=config.HTTP_TIMEOUT)

        photo_data = photo_resp.json()
        images = photo_data.get("images", [])

        if not images:
            log.error("Nepodařilo se získat URL z nahraného obrázku (photo_id=%s)", photo_id)
            return None

        # Největší (první) obrázek = nejlepší kvalita
        public_url = images[0].get("source", "")
        log.info("Získána veřejná URL obrázku: %s...%s", public_url[:50], public_url[-20:])
        return public_url

    def publish_to_instagram(
        self,
        caption: str,
        image_path: Path,
    ) -> dict:
        """
        Publikuje post na Instagram Business účet.

        Postup (Instagram Graph API):
        1. Nahrát obrázek jako unpublished FB foto → získat veřejnou URL
        2. Vytvořit media container na IG
        3. Počkat na zpracování
        4. Publikovat container

        Args:
            caption: text postu (max 2200 znaků)
            image_path: lokální cesta k obrázku

        Returns:
            dict: {'success': bool, 'media_id': str, 'error': str}
        """
        if not self.instagram_id:
            return {"success": False, "error": "INSTAGRAM_ACCOUNT_ID není nastaven v .env"}

        if not self.page_id:
            return {"success": False, "error": "META_PAGE_ID je potřeba pro upload obrázku"}

        if not image_path or not Path(image_path).exists():
            return {"success": False, "error": f"Obrázek nenalezen: {image_path}"}

        # Ořízni caption na 2200 znaků (IG limit)
        if len(caption) > 2200:
            log.warning("Caption zkrácen z %d na 2200 znaků pro Instagram", len(caption))
            caption = caption[:2197] + "..."

        # ── Krok 1: Upload obrázku → veřejná URL ──
        log.info("Instagram publikace — krok 1/3: upload obrázku...")
        image_url = self._upload_image_to_facebook_unpublished(image_path)
        if not image_url:
            return {"success": False, "error": "Nepodařilo se nahrát obrázek pro Instagram (FB upload selhal)"}

        # ── Krok 2: Vytvořit media container ──
        log.info("Instagram publikace — krok 2/3: vytváření kontejneru...")
        container_url = f"{self.GRAPH_API_URL}/{self.instagram_id}/media"
        container_resp = requests.post(container_url, data={
            "image_url": image_url,
            "caption": caption,
            "access_token": self.access_token,
        }, timeout=config.HTTP_TIMEOUT)

        container_result = container_resp.json()
        if "id" not in container_result:
            error = container_result.get("error", {}).get("message", str(container_result))
            log.error("IG container creation selhal: %s", error)
            return {"success": False, "error": f"Container creation failed: {error}"}

        container_id = container_result["id"]
        log.debug("IG container ID: %s", container_id)

        # ── Krok 2.5: Počkat na zpracování kontejneru ──
        # Instagram potřebuje čas na zpracování obrázku
        if not self._wait_for_container(container_id):
            return {"success": False, "error": "Timeout: Instagram nestihlo zpracovat obrázek (60s)"}

        # ── Krok 3: Publikovat container ──
        log.info("Instagram publikace — krok 3/3: publikace...")
        publish_url = f"{self.GRAPH_API_URL}/{self.instagram_id}/media_publish"
        publish_resp = requests.post(publish_url, data={
            "creation_id": container_id,
            "access_token": self.access_token,
        }, timeout=config.HTTP_TIMEOUT)

        publish_result = publish_resp.json()
        if "id" in publish_result:
            media_id = publish_result["id"]
            log.info("Instagram post publikován! media_id=%s", media_id)
            return {"success": True, "media_id": media_id}
        else:
            error = publish_result.get("error", {}).get("message", str(publish_result))
            log.error("IG publish selhal: %s", error)
            return {"success": False, "error": f"Publish failed: {error}"}

    def _wait_for_container(self, container_id: str, max_wait: int = 60) -> bool:
        """
        Čeká až Instagram zpracuje media container.
        Kontroluje status každé 3 sekundy, max 60s.

        Returns:
            True pokud je container FINISHED, False pokud timeout/error
        """
        status_url = f"{self.GRAPH_API_URL}/{container_id}"
        start = time.time()

        while time.time() - start < max_wait:
            resp = requests.get(status_url, params={
                "fields": "status_code,status",
                "access_token": self.access_token,
            }, timeout=config.HTTP_TIMEOUT)

            data = resp.json()
            status = data.get("status_code", "")

            if status == "FINISHED":
                log.debug("IG container %s zpracován (%.1fs)", container_id, time.time() - start)
                return True
            elif status == "ERROR":
                error_msg = data.get("status", "Unknown error")
                log.error("IG container error: %s", error_msg)
                return False
            elif status == "IN_PROGRESS":
                log.debug("IG container stále se zpracovává... (%.1fs)", time.time() - start)
            else:
                log.debug("IG container status: %s (%.1fs)", status or "unknown", time.time() - start)

            time.sleep(3)

        log.error("IG container timeout po %ds", max_wait)
        return False

    # ══════════════════════════════════════════════════
    # INSTAGRAM STORIES & CAROUSEL (rozšíření)
    # ══════════════════════════════════════════════════

    def publish_story_to_instagram(
        self,
        image_path: Path,
    ) -> dict:
        """
        Publikuje Instagram Story (jen obrázek, bez captionů).

        Returns:
            dict: {'success': bool, 'media_id': str, 'error': str}
        """
        if not self.instagram_id:
            return {"success": False, "error": "INSTAGRAM_ACCOUNT_ID není nastaven"}

        if not image_path or not Path(image_path).exists():
            return {"success": False, "error": f"Obrázek nenalezen: {image_path}"}

        # Upload na FB pro veřejnou URL
        image_url = self._upload_image_to_facebook_unpublished(image_path)
        if not image_url:
            return {"success": False, "error": "Upload obrázku selhal"}

        # Story container
        container_url = f"{self.GRAPH_API_URL}/{self.instagram_id}/media"
        container_resp = requests.post(container_url, data={
            "image_url": image_url,
            "media_type": "STORIES",
            "access_token": self.access_token,
        }, timeout=config.HTTP_TIMEOUT)

        container_result = container_resp.json()
        if "id" not in container_result:
            error = container_result.get("error", {}).get("message", str(container_result))
            return {"success": False, "error": f"Story container failed: {error}"}

        container_id = container_result["id"]

        if not self._wait_for_container(container_id):
            return {"success": False, "error": "Story processing timeout"}

        # Publish
        publish_resp = requests.post(
            f"{self.GRAPH_API_URL}/{self.instagram_id}/media_publish",
            data={"creation_id": container_id, "access_token": self.access_token},
            timeout=config.HTTP_TIMEOUT,
        )
        publish_result = publish_resp.json()

        if "id" in publish_result:
            log.info("IG Story publikována: %s", publish_result["id"])
            return {"success": True, "media_id": publish_result["id"]}
        else:
            error = publish_result.get("error", {}).get("message", str(publish_result))
            return {"success": False, "error": error}

    def publish_carousel_to_instagram(
        self,
        caption: str,
        image_paths: list[Path],
    ) -> dict:
        """
        Publikuje Instagram Carousel (2-10 obrázků).

        Args:
            caption: text pro celý carousel
            image_paths: seznam cest k obrázkům (2-10)

        Returns:
            dict: {'success': bool, 'media_id': str, 'error': str}
        """
        if not self.instagram_id:
            return {"success": False, "error": "INSTAGRAM_ACCOUNT_ID není nastaven"}

        if len(image_paths) < 2:
            return {"success": False, "error": "Carousel vyžaduje alespoň 2 obrázky"}
        if len(image_paths) > 10:
            return {"success": False, "error": "Carousel max 10 obrázků"}

        # Vytvoř children containers
        children_ids = []
        for i, img_path in enumerate(image_paths):
            if not Path(img_path).exists():
                return {"success": False, "error": f"Obrázek #{i+1} nenalezen: {img_path}"}

            image_url = self._upload_image_to_facebook_unpublished(img_path)
            if not image_url:
                return {"success": False, "error": f"Upload obrázku #{i+1} selhal"}

            child_resp = requests.post(
                f"{self.GRAPH_API_URL}/{self.instagram_id}/media",
                data={
                    "image_url": image_url,
                    "is_carousel_item": "true",
                    "access_token": self.access_token,
                },
                timeout=config.HTTP_TIMEOUT,
            )
            child_result = child_resp.json()
            if "id" not in child_result:
                error = child_result.get("error", {}).get("message", str(child_result))
                return {"success": False, "error": f"Carousel item #{i+1} failed: {error}"}

            children_ids.append(child_result["id"])
            log.debug("Carousel item #%d container: %s", i + 1, child_result["id"])

        # Počkej na zpracování všech children
        for cid in children_ids:
            if not self._wait_for_container(cid):
                return {"success": False, "error": f"Carousel item processing timeout: {cid}"}

        # Carousel container
        carousel_resp = requests.post(
            f"{self.GRAPH_API_URL}/{self.instagram_id}/media",
            data={
                "media_type": "CAROUSEL",
                "caption": caption[:2200],
                "children": ",".join(children_ids),
                "access_token": self.access_token,
            },
            timeout=config.HTTP_TIMEOUT,
        )
        carousel_result = carousel_resp.json()
        if "id" not in carousel_result:
            error = carousel_result.get("error", {}).get("message", str(carousel_result))
            return {"success": False, "error": f"Carousel container failed: {error}"}

        carousel_id = carousel_result["id"]
        if not self._wait_for_container(carousel_id):
            return {"success": False, "error": "Carousel processing timeout"}

        # Publish
        publish_resp = requests.post(
            f"{self.GRAPH_API_URL}/{self.instagram_id}/media_publish",
            data={"creation_id": carousel_id, "access_token": self.access_token},
            timeout=config.HTTP_TIMEOUT,
        )
        publish_result = publish_resp.json()

        if "id" in publish_result:
            log.info("IG Carousel publikován (%d obrázků): %s", len(image_paths), publish_result["id"])
            return {"success": True, "media_id": publish_result["id"]}
        else:
            error = publish_result.get("error", {}).get("message", str(publish_result))
            return {"success": False, "error": error}

    # ══════════════════════════════════════════════════
    # UTILITY
    # ══════════════════════════════════════════════════

    def verify_credentials(self) -> dict:
        """Ověří platnost Meta credentials"""
        url = f"{self.GRAPH_API_URL}/me"
        params = {"access_token": self.access_token}
        response = requests.get(url, params=params, timeout=config.HTTP_TIMEOUT)
        result = response.json()

        if "id" in result:
            return {"success": True, "name": result.get("name"), "id": result["id"]}
        else:
            return {"success": False, "error": result.get("error", {}).get("message", "Neplatný token")}

    def verify_instagram_access(self) -> dict:
        """Ověří přístup k Instagram Business účtu"""
        if not self.instagram_id:
            return {"success": False, "error": "INSTAGRAM_ACCOUNT_ID není nastaven"}

        url = f"{self.GRAPH_API_URL}/{self.instagram_id}"
        params = {
            "fields": "id,username,name,profile_picture_url,followers_count,media_count",
            "access_token": self.access_token,
        }
        response = requests.get(url, params=params, timeout=config.HTTP_TIMEOUT)
        result = response.json()

        if "id" in result:
            return {
                "success": True,
                "username": result.get("username", ""),
                "name": result.get("name", ""),
                "followers": result.get("followers_count", 0),
                "media_count": result.get("media_count", 0),
            }
        else:
            return {"success": False, "error": result.get("error", {}).get("message", "Neplatný IG token")}


def publish_approved_posts():
    """
    Publikuje všechny approved posty na sociální sítě.
    Spouštěj ručně nebo jako cron job.
    """
    from post_saver import load_all_posts

    posts = load_all_posts(status="approved")

    if not posts:
        log.info("Žádné approved posty k publikaci")
        return

    publisher = MetaPublisher()

    for post in posts:
        log.info("Publikuji: %s (%s)", post['topic'], post['platform'])

        # Připrav text (caption + hashtags)
        full_text = post['caption'] + "\n\n" + " ".join(post.get('hashtags', []))

        if post['platform'] == 'facebook':
            result = publisher.publish_to_facebook(
                message=full_text,
                image_path=post.get('image_path'),
            )
        elif post['platform'] == 'instagram':
            result = publisher.publish_to_instagram(
                caption=full_text,
                image_path=post.get('image_path'),
            )
        else:
            result = {"success": False, "error": f"Neznámá platforma: {post['platform']}"}

        if result["success"]:
            log.info("Publikováno! ID: %s", result.get('post_id') or result.get('media_id'))

            # Aktualizuj status na published
            post_path = config.POSTS_DIR / f"{post['id']}.json"
            if post_path.exists():
                with open(post_path, 'r') as f:
                    data = json.load(f)
                data['status'] = 'published'
                data['published_at'] = datetime.now().isoformat()
                with open(post_path, 'w') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
        else:
            log.error("Chyba publikace: %s", result.get('error'))


if __name__ == "__main__":
    from rich.console import Console
    console = Console()

    try:
        publisher = MetaPublisher()

        # Test FB credentials
        result = publisher.verify_credentials()
        if result["success"]:
            console.print(f"[green]✓ Meta API funguje. Přihlášen jako: {result['name']}[/green]")
        else:
            console.print(f"[red]✗ Chyba: {result['error']}[/red]")

        # Test IG credentials
        ig_result = publisher.verify_instagram_access()
        if ig_result["success"]:
            console.print(f"[green]✓ Instagram: @{ig_result['username']} ({ig_result['followers']} followers, {ig_result['media_count']} posts)[/green]")
        else:
            console.print(f"[yellow]⚠ Instagram: {ig_result['error']}[/yellow]")

    except ValueError as e:
        console.print(f"\n[red]{e}[/red]")
        console.print("\n[bold]NÁVOD jak získat Meta Access Token:[/bold]")
        console.print("1. Jdi na https://developers.facebook.com/")
        console.print("2. Vytvoř novou App (Business typ)")
        console.print("3. Přidej 'Facebook Login' produkt")
        console.print("4. V Graph API Explorer vygeneruj Page Access Token")
        console.print("5. Vlož token do .env souboru jako META_ACCESS_TOKEN")
        console.print("\n[bold]Pro Instagram navíc:[/bold]")
        console.print("6. Propoj Instagram Professional účet s Facebook stránkou")
        console.print("7. V Graph API Explorer najdi Instagram Business Account ID")
        console.print("8. Vlož do .env jako INSTAGRAM_ACCOUNT_ID")
