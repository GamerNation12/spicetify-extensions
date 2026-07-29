(function HidePodcasts() {
    if (!Spicetify || !Spicetify.Platform) {
        setTimeout(HidePodcasts, 300);
        return;
    }

    const observer = new MutationObserver(() => {
        // Find chips and navigation items containing "Podcasts" or "Audiobooks"
        const spans = document.querySelectorAll('span');
        for (const span of spans) {
            const text = span.textContent?.trim();
            if (text === 'Podcasts & Shows' || text === 'Audiobooks' || text === 'Podcasts') {
                
                // Hide containing button (like library/home filters)
                const btn = span.closest('button');
                if (btn && btn.style.display !== 'none') {
                    btn.style.display = 'none';
                }
                
                // Hide containing link (like sidebar navigation)
                const link = span.closest('a');
                if (link && link.href && (link.href.includes('/podcasts') || link.href.includes('/audiobooks'))) {
                    const li = link.closest('li');
                    if (li && li.style.display !== 'none') {
                        li.style.display = 'none';
                    } else if (link.style.display !== 'none') {
                        link.style.display = 'none';
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    
    console.log("Hide Podcasts & Audiobooks loaded.");
})();
