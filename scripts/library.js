import {
    addFavIcon,
    buildBlock,
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
    waitForLCP,
    getMetadata
} from './lib-franklin.js';

class FranklinLibrary {

    constructor(options = {}) {
        this.options = options
        this.lcp_blocks = typeof(options.lcp_blocks) == 'array' ? options.lcp_blocks : [];
        this.production_domains = typeof(options.production_domains) == 'array' ? options.production_domains : [];
        this.rum_generation = typeof(options.rum_generation) !== 'undefined' ? options.rum_generation : ''
        this.footer = typeof(options.footer) !== 'undefined' ? options.footer : 'core-footer'
        this.header = typeof(options.header) !== 'undefined' ? options.header : 'core-header'
        this.favicon = options?.favicon ?  options.favicon : '/lib/styles/favicon.png'
    }

    async buildAutoBlocks(main) {
        try {
            //await buildAnnouncement();
            // buildHeroBlock(main);
            this.buildISI(main);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Auto Blocking failed', error);
        }
    }

    buildISI(main) {
        if (getMetadata('isi') === 'off') return;
        const isi = buildBlock('core-isi', [[`<a href="/global/isi">${window.location.origin}/global/core-isi</a>`]]);
        const newSection = document.createElement('div');
        newSection.append(isi);
        main.append(newSection);
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
        addFavIcon(this.favicon);
        sampleRUM('lazy');
        sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
        sampleRUM.observe(main.querySelectorAll('picture > img'));

        if (window.location.hostname === 'localhost'
        || window.location.hostname.endsWith('.hlx.page')
        || window.location.hostname.endsWith('.hlx.reviews')
        || window.location.hostname.endsWith('.hlx.live')
        || window.location.hostname.endsWith('.franklin.edison.pfizer')
        || window.location.hostname.endsWith('.freshjones.dev')) {
            // await import(`${window.hlx.CDNBasePath}/tools/sidekick/review.js`);
        }

    }

    async handle404() {
        if (window.errorCode === '404') {
            const resp = await fetch('/global/404.plain.html');
            if (resp.status === 200) {
                const html = await resp.text();
                const main = document.querySelector('main');
                main.innerHTML = html;
                main.classList.remove('error');
            }
        }
    }

    loadDelayed() {
        // eslint-disable-next-line import/no-cycle
        window.setTimeout(() => import('./delayed.js'), 3000);
        // load anything that can be postponed to the latest here
    }


    /**
     * Initialize Window
     */
    setWindowProps(options = {}) {
        window.hlx = window.hlx || {};
        window.hlx.codeBasePath = typeof(options.codeBasePath) != 'undefined' ? options.codeBasePath : '';
        window.hlx.libraryBasePath = typeof(options.libraryBasePath) != 'undefined' ? options.libraryBasePath : '/lib';
        window.hlx.lighthouse = new URLSearchParams(window.location.search).get('lighthouse') === 'on';
        window.hlx.CDNBasePath = typeof(options.CDNBasePath) != 'undefined' ? options.CDNBasePath : '';
    }


    /**
     * initializiation.
     */
    initialize() {
        document.body.style.display = 'none';
        this.setWindowProps(this.options);
        sampleRUM('top');

        window.addEventListener('load', () => sampleRUM('load'));

        window.addEventListener('unhandledrejection', (event) => {
        sampleRUM('error', { source: event.reason.sourceURL, target: event.reason.line });
        });

        window.addEventListener('error', (event) => {
        sampleRUM('error', { source: event.filename, target: event.lineno });
        });
    }

    async loadPage() {

        //initialize library
        this.initialize();

        // handle 404 from document
        await this.handle404();

        //load eager
        await this.loadEager(document);

        //load lazy
        await this.loadLazy(document);

        //load delayed
        this.loadDelayed();
    }
}

export default FranklinLibrary;
