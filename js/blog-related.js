(function () {
    const grid = document.getElementById('related-posts-grid');
    if (!grid) return;

    const currentSlug = window.location.pathname.split('/').pop().replace('.html', '');

    fetch('/data/blog-index.json')
        .then(r => r.json())
        .then(blogIndex => {
            const related = blogIndex
                .filter(p => p.slug !== currentSlug)
                .sort(() => Math.random() - 0.5)
                .slice(0, 3);

            related.forEach(post => {
                const img = post.featured_image
                    ? post.featured_image.replace('../', '')
                    : 'img/blog-astrology.webp';

                grid.innerHTML += `<a href="../blog/${post.slug}.html" style="display:block;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;text-decoration:none;transition:transform 0.2s,border-color 0.2s;" onmouseover="this.style.transform='translateY(-3px)';this.style.borderColor='rgba(212,175,55,0.3)'" onmouseout="this.style.transform='';this.style.borderColor='rgba(255,255,255,0.08)'">
                    <img src="../${img}" alt="${post.title}" style="width:100%;height:140px;object-fit:cover;" loading="lazy" onerror="this.src='../img/blog-astrology.webp'">
                    <div style="padding:1rem;">
                        <p style="color:white;font-size:0.88rem;line-height:1.4;margin:0;font-weight:500;">${post.title}</p>
                    </div>
                </a>`;
            });
        })
        .catch(() => { /* tichý fail — related articles nejsou kritické */ });
})();
