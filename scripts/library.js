import {
    addFavIcon,
    buildISI,
    createOptimizedPicture,
    decorateBlocks,
    decorateButtons,
    decorateIcons,
    decorateSections,
    decorateTemplateAndTheme,
    loadBlocks,
    loadCSS,
    loadFooter,
    loadHeader,
    sampleRUM,
    waitForLCP
} from './lib-franklin.js';

class FranklinLibrary {

    constructor() {
        this.lcp_blocks = [];
        this.production_domains = [];
        this.rum_gneration = ''
    }

    async buildAutoBlocks(main) {
        try {
        //await buildAnnouncement();
        // buildHeroBlock(main);
        buildISI(main);
        } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Auto Blocking failed', error);
        }
    }

    async decorateMain(main, fragment = false) {
        // hopefully forward compatible button decoration
        decorateButtons(main);
        decorateIcons(main);
        if (!fragment) await this.buildAutoBlocks(main);

        decorateSections(main);
        const sections = [...main.querySelectorAll('.section')];
        sections.forEach((section) => {
            const bg = section.dataset.background;
            if (bg) {
                const picture = createOptimizedPicture(bg);
                picture.classList.add('section-background');
                section.prepend(picture);
            }
        });

        decorateBlocks(main);
    }

    async loadEager(doc) {
        document.documentElement.lang = 'en';
        decorateTemplateAndTheme();
        const main = doc.querySelector('main');
        if (main) {
            await this.decorateMain(main);
            document.body.classList.add('appear');
            await waitForLCP(this.lcp_blocks);
        }
    }

    async loadLazy(doc) {
        const main = doc.querySelector('main');
        await loadBlocks(main);

        const { hash } = window.location;
        const element = hash ? doc.getElementById(hash.substring(1)) : false;
        if (hash && element) element.scrollIntoView();

        loadHeader(doc.querySelector('header'));
        loadFooter(doc.querySelector('footer'));

        loadCSS(`${window.hlx.libraryBasePath}/styles/lazy-styles.css`);
        addFavIcon('/assets/favicon.png');
        sampleRUM('lazy');
        sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
        sampleRUM.observe(main.querySelectorAll('picture > img'));

        if (window.location.hostname === 'localhost'
        || window.location.hostname.endsWith('.hlx.page')
        || window.location.hostname.endsWith('.hlx.reviews')
        || window.location.hostname.endsWith('.hlx.live')
        || window.location.hostname.endsWith('.franklin.edison.pfizer')
        || window.location.hostname.endsWith('.freshjones.dev')) {
            await import(`${window.hlx.CDNBasePath}/tools/sidekick/review.js`);
        }

    }

    loadDelayed() {
        // eslint-disable-next-line import/no-cycle
        window.setTimeout(() => import('./delayed.js'), 3000);
        // load anything that can be postponed to the latest here
    }

    async loadPage() {
        // handle 404 from document
        if (window.errorCode === '404') {
          const resp = await fetch('/global/404.plain.html');
          if (resp.status === 200) {
            const html = await resp.text();
            const main = document.querySelector('main');
            main.innerHTML = html;
            main.classList.remove('error');
          }
        }
        await this.loadEager(document);
        await this.loadLazy(document);
        this.loadDelayed();
    }


}

export default FranklinLibrary;
