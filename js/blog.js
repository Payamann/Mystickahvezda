document.addEventListener('DOMContentLoaded', async () => {

    const container = document.getElementById('blogContainer');
    const featuredContainer = document.getElementById('featuredContainer');
    const filterContainer = document.getElementById('categoryFilter');
    const gridTitle = document.getElementById('gridTitle');

    let allPosts = [];

    try {
        const response = await fetch('/data/blog-index.json');
        if (!response.ok) throw new Error('Data index nebyl nalezen');
        allPosts = await response.json();

        container.innerHTML = '';

        if (allPosts.length === 0) {
            throw new Error("Žádné články");
        }

        const categories = new Set();
        allPosts.forEach(p => { if (p.category) categories.add(p.category); });

        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'category-btn';
            btn.dataset.category = cat;
            btn.textContent = cat;
            filterContainer.appendChild(btn);
        });

        renderAll(allPosts);

    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="no-results">Zatím nebyly publikovány žádné články.</div>';
        featuredContainer.style.display = 'none';
        gridTitle.style.display = 'none';
    }

    filterContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-btn')) {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            const cat = e.target.dataset.category;
            if (cat === 'all') {
                renderAll(allPosts);
            } else {
                const filtered = allPosts.filter(p => p.category === cat);
                renderFilteredGrid(filtered, cat);
            }
        }
    });

    function renderAll(posts) {
        if (posts.length === 0) return;

        gridTitle.style.display = 'block';
        featuredContainer.style.display = 'block';
        gridTitle.textContent = "Nejnovější články";

        const featured = posts[0];
        const rest = posts.slice(1);

        renderFeaturedPost(featured);
        renderPostsGrid(rest);
    }

    function renderFilteredGrid(posts, categoryStr) {
        featuredContainer.style.display = 'none';
        gridTitle.style.display = 'block';
        gridTitle.textContent = `Články v kategorii: ${categoryStr}`;
        renderPostsGrid(posts);
    }

    function renderFeaturedPost(post) {
        const date = new Date(post.published_at).toLocaleDateString('cs-CZ', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        const imageSrc = post.featured_image || 'img/hero-3d.webp';
        const readTime = post.readTime ? `${post.readTime} min.` : 'Zajímavost';

        featuredContainer.innerHTML = `
            <a href="blog/${post.slug}.html" class="featured-post">
                <div class="featured-post__image-wrapper">
                    <img src="${imageSrc}" alt="" role="presentation" class="featured-post__image" loading="lazy"
                        onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg,#1a0a2e,#2d1747)';">
                </div>
                <div class="featured-post__content">
                    <div class="featured-post__meta">
                        <span>${post.category || 'Článek'}</span>
                        <span>•</span>
                        <span>${date}</span>
                    </div>
                    <h2 class="featured-post__title">${post.title}</h2>
                    <p class="featured-post__desc">${post.short_description || ''}</p>
                    <div class="featured-post__meta" style="margin-bottom:0; justify-content:space-between; align-items:center;">
                        <span class="btn-read-more">Číst článek <span>›</span></span>
                        <span>📖 ${readTime}</span>
                    </div>
                </div>
            </a>
        `;
    }

    function renderPostsGrid(posts) {
        container.innerHTML = '';
        if (posts.length === 0) {
            container.innerHTML = '<div class="no-results">Žádné další články k zobrazení.</div>';
            return;
        }

        posts.forEach(post => {
            const date = new Date(post.published_at).toLocaleDateString('cs-CZ', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            const imageSrc = post.featured_image || 'img/hero-3d.webp';
            const readTime = post.readTime ? `${post.readTime} min.` : '';

            const el = document.createElement('a');
            el.href = `blog/${post.slug}.html`;
            el.className = 'blog-card';
            el.innerHTML = `
                <div style="overflow:hidden; border-radius:16px 16px 0 0;">
                    <img src="${imageSrc}" alt="" role="presentation" class="blog-card-image" loading="lazy"
                        onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg,#1a0a2e,#2d1747)'; this.parentElement.style.height='185px';">
                </div>
                <div class="blog-card-content">
                    <div class="blog-meta-small">
                        ${post.category || 'Článek'}
                    </div>
                    <div class="blog-title">${post.title}</div>
                    <div class="blog-desc">${post.short_description || ''}</div>
                    <div class="blog-footer">
                        <span>📅 ${date}</span>
                        <span>📖 ${readTime}</span>
                    </div>
                </div>
            `;
            container.appendChild(el);
        });
    }

});
