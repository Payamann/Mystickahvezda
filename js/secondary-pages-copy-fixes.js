(() => {
  const path = window.location.pathname.split('/').pop() || 'index.html';

  const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  };

  const setHtml = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.innerHTML = value;
  };

  const setAttr = (selector, attribute, value) => {
    const element = document.querySelector(selector);
    if (element) element.setAttribute(attribute, value);
  };

  const setMetaByName = (name, value) => {
    const element = document.querySelector(`meta[name="${name}"]`);
    if (element) element.setAttribute('content', value);
  };

  const setMetaByProperty = (property, value) => {
    const element = document.querySelector(`meta[property="${property}"]`);
    if (element) element.setAttribute('content', value);
  };

  const updateJsonLd = (matcher, updates) => {
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(script.textContent);
        if (matcher(data)) {
          Object.assign(data, updates);
          script.textContent = JSON.stringify(data, null, 2);
        }
      } catch {
        // Ignore invalid JSON-LD blocks.
      }
    }
  };

  const fixes = {
    '404.html': () => {
      document.title = 'Str\u00e1nka nenalezena | Mystick\u00e1 Hv\u011bzda';
      setText('.page-404__icon', '\u2728');
      setText('.page-404__title', 'Hv\u011bzdy v\u00e1s sem nevedly');
      setHtml(
        '.page-404__subtitle',
        'Str\u00e1nka, kterou hled\u00e1te, neexistuje nebo byla p\u0159esunuta.<br>Mo\u017en\u00e1 v\u00e1s sem ale hv\u011bzdy p\u0159ivedly, aby v\u00e1s navedly jinam.'
      );
      setText('.btn.btn--primary', '\u2190 Zp\u011bt na hlavn\u00ed str\u00e1nku');

      const labels = [
        '\ud83c\udf19 Horoskopy',
        '\ud83d\udd2e Tarot',
        '\u2b50 Nat\u00e1ln\u00ed karta',
        '\ud83d\udd22 Numerologie',
        '\ud83d\udd2e K\u0159i\u0161\u0165\u00e1lov\u00e1 koule',
        '\u16b1 Runy',
        '\ud83d\udcab Partnersk\u00e1 shoda',
        '\ud83e\udded Pr\u016fvodce',
        '\ud83d\udcdd Blog',
        '\u2728 Cen\u00edk'
      ];

      document.querySelectorAll('.page-404__links a').forEach((link, index) => {
        if (labels[index]) link.textContent = labels[index];
      });
    },

    'afirmace.html': () => {
      document.title = 'Denn\u00ed afirmace podle znamen\u00ed zv\u011brokruhu | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        'Va\u0161e dne\u0161n\u00ed afirmace podle znamen\u00ed zv\u011brokruhu a f\u00e1ze M\u011bs\u00edce. Personalizovan\u00e9 pozitivn\u00ed afirmace pro ka\u017ed\u00fd den zdarma.'
      );
      setMetaByProperty('og:title', 'Denn\u00ed afirmace pro v\u00e1\u0161 horoskop | Mystick\u00e1 Hv\u011bzda');
      setMetaByProperty(
        'og:description',
        'Dne\u0161n\u00ed afirmace podle va\u0161eho znamen\u00ed zv\u011brokruhu a aktu\u00e1ln\u00ed f\u00e1ze M\u011bs\u00edce.'
      );
      updateJsonLd(
        (data) => data?.url === 'https://www.mystickahvezda.cz/afirmace.html',
        {
          name: 'Denn\u00ed afirmace podle znamen\u00ed zv\u011brokruhu',
          description: 'Personalizovan\u00e9 denn\u00ed afirmace pro ka\u017ed\u00e9 znamen\u00ed zv\u011brokruhu. Pozitivn\u00ed mantry pro v\u00e1\u0161 den.'
        }
      );

      setText('.section__badge', 'Ka\u017ed\u00fd den nov\u00e1');
      setHtml('.section__title', 'Denn\u00ed <span class="text-gradient">Afirmace</span>');
      setText('.section__text', 'Vyberte sv\u00e9 znamen\u00ed a z\u00edskejte dne\u0161n\u00ed osobn\u00ed afirmaci nalad\u011bnou na hv\u011bzdy.');
      setText('#moon-badge', '\ud83c\udf19 F\u00e1ze M\u011bs\u00edce');
      setText('#btn-copy-affirmation', '\ud83d\udccb Kop\u00edrovat');
      setText('#btn-share-affirmation', '\ud83d\udce4 Sd\u00edlet');
      setText('#btn-horoskop-link', '\ud83c\udf19 Horoskop dnes');
      setText('#copy-confirm', '\u2714 Zkop\u00edrov\u00e1no!');

      const zodiac = [
        ['\u2648', 'Beran'],
        ['\u2649', 'B\u00fdk'],
        ['\u264a', 'Bl\u00ed\u017eenci'],
        ['\u264b', 'Rak'],
        ['\u264c', 'Lev'],
        ['\u264d', 'Panna'],
        ['\u264e', 'V\u00e1hy'],
        ['\u264f', '\u0160t\u00edr'],
        ['\u2650', 'St\u0159elec'],
        ['\u2651', 'Kozoroh'],
        ['\u2652', 'Vodn\u00e1\u0159'],
        ['\u2653', 'Ryby']
      ];

      document.querySelectorAll('.zodiac-btn').forEach((button, index) => {
        const config = zodiac[index];
        if (!config) return;
        const [icon, label] = config;
        const iconNode = button.querySelector('span');
        if (iconNode) iconNode.textContent = icon;
        button.setAttribute('aria-label', label);
        if (button.childNodes.length > 1) {
          button.childNodes[button.childNodes.length - 1].textContent = label;
        }
      });

      const ctaText = document.querySelector('[data-animate] p[style*="margin-bottom:1rem;"]');
      if (ctaText) {
        ctaText.textContent = 'Chcete afirmace ka\u017ed\u00e9 r\u00e1no p\u0159\u00edmo do e-mailu spolu s personalizovan\u00fdm horoskopem?';
      }

      const ctaButton = document.querySelector('[data-animate] a[href*="cenik.html"]');
      if (ctaButton) ctaButton.textContent = '\u2728 Vyzkou\u0161et Premium';
    },

    'andelska-posta.html': () => {
      document.title = 'And\u011blsk\u00e1 po\u0161ta | Napi\u0161te vzkaz and\u011bl\u016fm | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        'Napi\u0161te sv\u00e9 p\u0159\u00e1n\u00ed, prosbu nebo pod\u011bkov\u00e1n\u00ed and\u011bl\u016fm. And\u011blsk\u00e1 po\u0161ta je bezpe\u010dn\u00fd prostor pro sd\u00edlen\u00ed a jemnou podporu komunity.'
      );
      setMetaByProperty('og:title', 'And\u011blsk\u00e1 po\u0161ta | Vzkaz and\u011bl\u016fm | Mystick\u00e1 Hv\u011bzda');
      setMetaByProperty(
        'og:description',
        'Napi\u0161te sv\u016fj vzkaz and\u011bl\u016fm a sd\u00edlejte ho s komunitou duchovn\u00edch hleda\u010d\u016f.'
      );
      updateJsonLd(
        (data) => data?.url === 'https://www.mystickahvezda.cz/andelska-posta.html',
        {
          name: 'And\u011blsk\u00e1 po\u0161ta | Komunitn\u00ed vzkazy and\u011bl\u016fm',
          description: 'Sd\u00edlejte sv\u00e9 and\u011blsk\u00e9 vzkazy s komunitou Mystick\u00e9 Hv\u011bzdy a inspirujte se zpr\u00e1vami ostatn\u00edch.'
        }
      );

      setText('.section__badge', 'Duchovn\u00ed komunita');
      setHtml('.section__title', 'And\u011blsk\u00e1 <span class="text-gradient">Po\u0161ta</span>');
      setText('.section__text', 'Napi\u0161te vzkaz, p\u0159\u00e1n\u00ed nebo prosbu and\u011bl\u016fm. Ostatn\u00ed jej uvid\u00ed a podpo\u0159\u00ed sv\u00fdm srdcem.');

      const labels = document.querySelectorAll('.message-form label');
      if (labels[0]) labels[0].textContent = 'Va\u0161e p\u0159ezd\u00edvka (nepovinn\u00e9)';
      if (labels[1]) labels[1].textContent = 'V\u00e1\u0161 vzkaz and\u011bl\u016fm';
      if (labels[2]) labels[2].textContent = 'Kategorie';

      setAttr('#msg-nickname', 'placeholder', 'Anonym');
      setAttr('#msg-nickname', 'aria-label', 'P\u0159ezd\u00edvka');
      setAttr('#msg-text', 'placeholder', 'Draz\u00ed and\u011bl\u00e9, pros\u00edm v\u00e1s o...');
      setAttr('#msg-text', 'aria-label', 'Vzkaz and\u011bl\u016fm');

      const options = [
        '\u2764\ufe0f L\u00e1ska a vztahy',
        '\ud83e\ude7a Zdrav\u00ed a uzdraven\u00ed',
        '\ud83d\udcbc Kari\u00e9ra a finance',
        '\ud83c\udfe0 Rodina a domov',
        '\ud83d\ude4f Vd\u011b\u010dnost',
        '\u2728 Jin\u00e9'
      ];

      document.querySelectorAll('#msg-category option').forEach((option, index) => {
        if (options[index]) option.textContent = options[index];
      });

      setText('#btn-submit-msg', '\ud83d\udc7c Odeslat and\u011bl\u016fm');
      const wallTitle = document.querySelector('.messages-wall h2');
      if (wallTitle) wallTitle.textContent = '\u2728 Ned\u00e1vn\u00e9 vzkazy komunity';
    },

    'astro-mapa.html': () => {
      document.title = 'Astrokartografie | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        'Astrokartografie jako symbolick\u00e1 mapa prost\u0159ed\u00ed: porovnejte m\u00edsta pro cestov\u00e1n\u00ed, relokaci a osobn\u00ed z\u00e1m\u011br bez slibu, \u017ee planeta ur\u010d\u00ed v\u00fdsledek.'
      );
      setMetaByProperty('og:title', 'Astrokartografie | Mystick\u00e1 Hv\u011bzda');
      setMetaByProperty(
        'og:description',
        'Porovnejte symbolick\u00e1 t\u00e9mata m\u00edst pro cestov\u00e1n\u00ed, relokaci nebo rozhodnut\u00ed. Mapa je podklad k \u00favaze, ne jistota v\u00fdsledku.'
      );

      setText('.skip-link', 'P\u0159esko\u010dit na obsah');
      setText(
        '.hero__subtitle',
        'Kter\u00e1 m\u00edsta mohou otev\u0159\u00edt nov\u00fd impuls? Zadejte narozen\u00ed a z\u00e1m\u011br a z\u00edskejte symbolickou mapu t\u00e9mat pro cestov\u00e1n\u00ed, relokaci nebo rozhodnut\u00ed. Berte ji jako podklad k \u00favaze, ne jako jistotu v\u00fdsledku.'
      );

      const mainCardTitle = document.querySelector('.card__title');
      if (mainCardTitle) mainCardTitle.textContent = 'Zadejte sv\u00e9 \u00fadaje';

      const profileToggle = document.querySelector('#profile-option-wrapper span');
      if (profileToggle) profileToggle.textContent = 'M\u016fj profil';

      const profileWrapper = document.querySelector('#profile-option-wrapper');
      if (profileWrapper) profileWrapper.setAttribute('title', 'Pou\u017e\u00edt \u00fadaje z m\u00e9ho profilu');

      const formLabels = {
        'astro-name': 'Jm\u00e9no',
        'astro-date': 'Datum narozen\u00ed',
        'astro-time': '\u010cas narozen\u00ed',
        'astro-place': 'M\u00edsto narozen\u00ed',
        'astro-intention': 'Z\u00e1m\u011br cesty (voliteln\u00e9)'
      };

      Object.entries(formLabels).forEach(([id, text]) => {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) label.textContent = text;
      });

      setAttr('#astro-name', 'placeholder', 'Va\u0161e jm\u00e9no');
      setAttr('#astro-place', 'placeholder', 'Nap\u0159. Praha');

      const optionLabels = [
        '\ud83c\udf0d Obecn\u00fd p\u0159ehled',
        '\ud83d\udcbc Kari\u00e9ra a \u00fasp\u011bch',
        '\u2764\ufe0f L\u00e1ska a vztahy',
        '\u2695\ufe0f Zdrav\u00ed a relaxace',
        '\u2728 Duchovn\u00ed r\u016fst',
        '\ud83c\udfe0 Domov a rodina'
      ];

      document.querySelectorAll('#astro-intention option').forEach((option, index) => {
        if (optionLabels[index]) option.textContent = optionLabels[index];
      });

      const submit = document.querySelector('#astro-form button[type="submit"]');
      if (submit) submit.textContent = '\ud83c\udf0d Sestavit symbolickou mapu';

      setAttr('.map-bg', 'alt', 'Astrokartografick\u00e1 mapa sv\u011bta');
      const loadingText = document.querySelector('#astro-loading span');
      if (loadingText) loadingText.textContent = 'Skl\u00e1d\u00e1m symbolickou mapu prost\u0159ed\u00ed...';

      const serviceTitles = document.querySelectorAll('.card.card--service .card__title');
      const serviceTexts = document.querySelectorAll('.card.card--service .card__text');
      const titles = ['Co je astrokartografie?', 'Relokace', 'Cestov\u00e1n\u00ed'];
      const texts = [
        'Symbolick\u00fd v\u00fdklad, kter\u00fd propojuje va\u0161e narozen\u00ed, z\u00e1m\u011br a mapu sv\u011bta. Ukazuje, ve kter\u00fdch zem\u00edch mohou b\u00fdt pro v\u00e1s zaj\u00edmav\u00e1 t\u00e9mata r\u016fstu, vztah\u016f nebo kari\u00e9ry.',
        'P\u0159em\u00fd\u0161l\u00edte o st\u011bhov\u00e1n\u00ed? Porovnejte, jak\u00e1 t\u00e9mata m\u016f\u017ee nov\u00e1 destinace symbolicky otev\u0159\u00edt. V\u00fdsledek berte jako podklad k rozhodnut\u00ed, ne jako pokyn, kam se p\u0159est\u011bhovat.',
        'P\u0159i pl\u00e1nov\u00e1n\u00ed cesty si v\u0161imn\u011bte, jak\u00fd typ z\u00e1\u017eitku hled\u00e1te: odpo\u010dinek, vztahy, pr\u00e1ci nebo inspiraci. Mapa pom\u016f\u017ee pojmenovat z\u00e1m\u011br, ne vybrat dovolenou za v\u00e1s.'
      ];

      serviceTitles.forEach((element, index) => {
        if (titles[index]) element.textContent = titles[index];
      });
      serviceTexts.forEach((element, index) => {
        if (texts[index]) element.textContent = texts[index];
      });

      const crossHeading = Array.from(document.querySelectorAll('h3')).find((element) =>
        element.textContent.includes('Pokra')
      );
      if (crossHeading) {
        crossHeading.innerHTML = 'Pokra\u010dujte ve sv\u00e9 <span class="text-gradient">duchovn\u00ed cest\u011b</span>';
      }

      const crossCards = document.querySelectorAll('section a.card');
      const cardData = [
        ['\ud83d\udc7c', 'And\u011blsk\u00e1 karta', 'Poselstv\u00ed na dne\u0161n\u00ed den'],
        ['\ud83d\udd2e', 'K\u0159i\u0161\u0165\u00e1lov\u00e1 koule', 'Zeptejte se na cokoli'],
        ['\ud83c\udfb4', 'Tarotov\u00fd v\u00fdklad', 'Hloubkov\u00fd vhled'],
        ['\u2728', 'Denn\u00ed horoskop', 'Va\u0161e znamen\u00ed dnes'],
        ['\ud83e\udded', 'Hv\u011bzdn\u00fd pr\u016fvodce', 'Osobn\u00ed veden\u00ed']
      ];

      crossCards.forEach((card, index) => {
        const config = cardData[index];
        if (!config) return;
        const [icon, title, subtitle] = config;
        const blocks = card.querySelectorAll('div');
        if (blocks[0]) blocks[0].textContent = icon;
        if (blocks[1]) blocks[1].textContent = title;
        if (blocks[2]) blocks[2].textContent = subtitle;
      });
    },

    'aura.html': () => {
      document.title = 'Aura kalkula\u010dka | Zjist\u011bte barvu sv\u00e9 aury | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        'Zjist\u011bte barvu sv\u00e9 aury podle data narozen\u00ed. Aura kalkula\u010dka zdarma s detailn\u00edm popisem, \u010dakrou, krystaly, siln\u00fdmi str\u00e1nkami i \u017eivotn\u00edm posl\u00e1n\u00edm.'
      );
      setMetaByProperty('og:title', 'Aura kalkula\u010dka | Jak\u00e1 je barva va\u0161\u00ed aury? | Mystick\u00e1 Hv\u011bzda');
      setMetaByProperty(
        'og:description',
        'Zadejte datum narozen\u00ed a zjist\u011bte barvu sv\u00e9 aury zdarma a okam\u017eit\u011b.'
      );
      updateJsonLd(
        (data) => data?.applicationCategory === 'EntertainmentApplication',
        {
          name: 'Aura kalkula\u010dka',
          description: 'V\u00fdpo\u010det barvy aury podle data narozen\u00ed'
        }
      );
    },

    'biorytmy.html': () => {
      document.title = 'Osobn\u00ed biorytmy | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        'Zjist\u011bte sv\u00e9 osobn\u00ed biorytmy. Fyzick\u00fd, emo\u010dn\u00ed a intelektu\u00e1ln\u00ed cyklus podle data narozen\u00ed zdarma a online.'
      );
      setMetaByProperty('og:title', 'Osobn\u00ed biorytmy online | Mystick\u00e1 Hv\u011bzda');
      setMetaByProperty(
        'og:description',
        'Odhalte sv\u00e9 siln\u00e9 a slab\u00e9 dny. V\u00fdpo\u010det osobn\u00edch biorytm\u016f zdarma na Mystick\u00e9 Hv\u011bzd\u011b.'
      );
      updateJsonLd(
        (data) => data?.applicationCategory === 'LifestyleApplication' && data?.name?.includes('Biorytm'),
        {
          name: 'V\u00fdpo\u010det biorytm\u016f online'
        }
      );
    },

    'cinsky-horoskop.html': () => {
      document.title = '\u010c\u00ednsk\u00fd horoskop 2026 | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        '\u010c\u00ednsk\u00fd horoskop 2026: zadejte rok narozen\u00ed a zjist\u011bte sv\u00e9 \u010d\u00ednsk\u00e9 znamen\u00ed. Krysa, B\u00fdk, Tygr, Drak a dal\u0161\u00ed zv\u00ed\u0159ata s progn\u00f3zou na rok 2026.'
      );
      setMetaByProperty('og:title', '\u010c\u00ednsk\u00fd horoskop 2026 | Mystick\u00e1 Hv\u011bzda');
      setMetaByProperty(
        'og:description',
        'Zjist\u011bte sv\u00e9 \u010d\u00ednsk\u00e9 znamen\u00ed a progn\u00f3zu na rok 2026.'
      );
      updateJsonLd(
        (data) => data?.['@type'] === 'WebPage' && typeof data?.name === 'string' && data.name.includes('horoskop'),
        {
          name: '\u010c\u00ednsk\u00fd horoskop 2026'
        }
      );
    },

    'kalkulacka-cisla-osudu.html': () => {
      document.title = 'Kalkula\u010dka \u010c\u00edsla osudu | Va\u0161e numerologick\u00e9 \u010d\u00edslo zdarma | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        'Zjist\u011bte sv\u00e9 \u010c\u00edslo osudu zdarma. Zadejte datum narozen\u00ed a okam\u017eit\u011b odhalte, co o v\u00e1s \u0159\u00edkaj\u00ed \u010d\u00edsla. Bezplatn\u00e1 numerologick\u00e1 kalkula\u010dka bez registrace.'
      );
      setMetaByProperty('og:title', 'Kalkula\u010dka \u010c\u00edsla osudu | Numerologie zdarma');
      setMetaByProperty(
        'og:description',
        'Zadejte datum narozen\u00ed a zjist\u011bte sv\u00e9 \u010c\u00edslo osudu. Bezplatn\u00e1 numerologick\u00e1 kalkula\u010dka.'
      );
      updateJsonLd(
        (data) => data?.url === 'https://www.mystickahvezda.cz/kalkulacka-cisla-osudu.html',
        {
          name: 'Kalkula\u010dka \u010c\u00edsla osudu',
          description: 'Bezplatn\u00e1 numerologick\u00e1 kalkula\u010dka. Zjist\u011bte sv\u00e9 \u010c\u00edslo osudu zad\u00e1n\u00edm data narozen\u00ed.'
        }
      );
    },

    'faq.html': () => {
      document.title = '\u010casto kladen\u00e9 dotazy | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        'Odpov\u011bdi na ot\u00e1zky o v\u00fdkladech, pr\u00e1ci s daty, soukrom\u00ed, platb\u00e1ch a hranic\u00edch slu\u017eby Mystick\u00e1 Hv\u011bzda.'
      );
      setMetaByProperty('og:title', '\u010casto kladen\u00e9 dotazy | Mystick\u00e1 Hv\u011bzda');
      setMetaByProperty(
        'og:description',
        'Odpov\u011bdi k v\u00fdklad\u016fm, soukrom\u00ed, platb\u00e1m a tomu, kde jsou hranice slu\u017eby Mystick\u00e1 Hv\u011bzda.'
      );
      updateJsonLd(
        (data) => data?.['@type'] === 'FAQPage',
        { name: '\u010casto kladen\u00e9 dotazy' }
      );

      setText('.skip-link', 'P\u0159esko\u010dit na obsah');
      setHtml('.hero__title .text-gradient', '\u010casto kladen\u00e9 ot\u00e1zky');
      setText('.hero__subtitle', 'Jasn\u00e9 odpov\u011bdi k v\u00fdklad\u016fm, soukrom\u00ed, platb\u00e1m a tomu, kde jsou hranice slu\u017eby.');

      const categoryTitles = [
        'Astrologick\u00e9 slu\u017eby',
        'P\u0159edplatn\u00e9 a platby',
        'Soukrom\u00ed a bezpe\u010d\u00ed'
      ];
      document.querySelectorAll('.faq-category__title').forEach((title, index) => {
        if (categoryTitles[index]) title.textContent = categoryTitles[index];
      });
    },

    'kontakt.html': () => {
      document.title = 'Kontakt | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        'Kontaktujte n\u00e1s s dotazy, p\u0159ipom\u00ednkami nebo n\u00e1vrhy. R\u00e1di v\u00e1m pom\u016f\u017eeme s horoskopy, tarotem i p\u0159edplatn\u00fdm.'
      );
      setMetaByProperty('og:title', 'Kontakt | Mystick\u00e1 Hv\u011bzda');
      setMetaByProperty(
        'og:description',
        'M\u00e1te dotaz? Napi\u0161te n\u00e1m a ozveme se co nejd\u0159\u00edve.'
      );
      updateJsonLd(
        (data) => data?.['@type'] === 'ContactPage',
        { name: 'Kontakt' }
      );

      setText('.skip-link', 'P\u0159esko\u010dit na obsah');
      setHtml('.hero__title .text-gradient', 'Kontaktujte n\u00e1s');
      setText('.hero__subtitle', 'M\u00e1te ot\u00e1zky? Jsme tu pro v\u00e1s. Napi\u0161te n\u00e1m nebo se ozv\u011bte e-mailem.');

      const cardTitle = document.querySelector('.card__title');
      if (cardTitle) cardTitle.textContent = 'Kontaktn\u00ed \u00fadaje';

      const firstParagraph = document.querySelector('.card p.mb-lg');
      if (firstParagraph) {
        firstParagraph.textContent =
          'R\u00e1di zodpov\u00edme va\u0161e dotazy k horoskop\u016fm, tarotov\u00fdm v\u00fdklad\u016fm i dal\u0161\u00edm slu\u017eb\u00e1m Mystick\u00e9 Hv\u011bzdy.';
      }

      const strongs = document.querySelectorAll('.contact-item strong');
      const strongTexts = [
        '\ud83d\udce7 Email:',
        '\u23f1\ufe0f Doba odpov\u011bdi:',
        '\ud83c\udf10 Online slu\u017eba:'
      ];
      strongs.forEach((item, index) => {
        if (strongTexts[index]) item.textContent = strongTexts[index];
      });

      const spans = document.querySelectorAll('.contact-item .text-silver');
      if (spans[1]) spans[1].textContent = 'Obvykle do 24 hodin';
      if (spans[2]) spans[2].innerHTML = 'Fungujeme 100% online,<br>dostupn\u00ed odkudkoli';

      const headings = document.querySelectorAll('.card__title');
      if (headings[1]) headings[1].textContent = 'Napi\u0161te n\u00e1m';

      setAttr('#contact-name', 'placeholder', 'Va\u0161e jm\u00e9no');
      setAttr('#contact-email', 'placeholder', 'V\u00e1\u0161 e-mail');
      setAttr('#contact-subject', 'placeholder', 'P\u0159edm\u011bt zpr\u00e1vy');
      setAttr('#contact-message', 'placeholder', 'Va\u0161e zpr\u00e1va...');
      const submit = document.querySelector('button[type="submit"]');
      if (submit) submit.textContent = 'Odeslat zpr\u00e1vu';
    },

    'o-nas.html': () => {
      setText('.skip-link', 'P\u0159esko\u010dit na obsah');
      setText('.section__badge', 'O n\u00e1s');
    },

    'ochrana-soukromi.html': () => {
      document.title = 'Ochrana soukrom\u00ed | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        'Z\u00e1sady ochrany soukrom\u00ed slu\u017eby Mystick\u00e1 Hv\u011bzda. Informace o tom, jak zpracov\u00e1v\u00e1me a chr\u00e1n\u00edme va\u0161e osobn\u00ed \u00fadaje.'
      );
      setMetaByProperty('og:title', 'Ochrana soukrom\u00ed | Mystick\u00e1 Hv\u011bzda');
      setMetaByProperty(
        'og:description',
        'Z\u00e1sady ochrany soukrom\u00ed a zpracov\u00e1n\u00ed osobn\u00edch \u00fadaj\u016f.'
      );
      updateJsonLd(
        (data) => data?.url === 'https://www.mystickahvezda.cz/ochrana-soukromi.html',
        {
          name: 'Ochrana soukrom\u00ed | Mystick\u00e1 Hv\u011bzda',
          description: 'Z\u00e1sady ochrany osobn\u00edch \u00fadaj\u016f a soukrom\u00ed na Mystick\u00e9 Hv\u011bzd\u011b.'
        }
      );

      setText('.skip-link', 'P\u0159esko\u010dit na obsah');
      setHtml('.hero__title .text-gradient', 'Ochrana soukrom\u00ed');
      setText('.hero__subtitle', 'Jak zpracov\u00e1v\u00e1me a chr\u00e1n\u00edme va\u0161e osobn\u00ed \u00fadaje');
    },

    'blog.html': () => {
      document.title = 'Astrologick\u00fd blog | Horoskopy, tarot a numerologie | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        'Astrologick\u00fd blog Mystick\u00e9 Hv\u011bzdy: \u010dl\u00e1nky o horoskopech, tarotu, numerologii a duchovn\u00edm r\u016fstu. Praktick\u00e9 tipy pro sebepozn\u00e1n\u00ed i ka\u017edodenn\u00ed \u017eivot.'
      );
      setText('.hero__title', 'Mystick\u00fd Blog');
      const gradient = document.querySelector('.hero__title .text-gradient');
      if (gradient) gradient.textContent = 'Blog';
      setText(
        '.hero__subtitle',
        'Pono\u0159te se do hlubin tajemn\u00fdch nauk a objevujte souvislosti mezi astrologi\u00ed, tarotem, numerologi\u00ed a b\u011b\u017en\u00fdm \u017eivotem.'
      );
    },

    'slovnik.html': () => {
      document.title = 'Ezoterick\u00fd slovn\u00edk | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        'Va\u0161e encyklopedie astrologick\u00fdch, mystick\u00fdch a esoterick\u00fdch pojm\u016f. Objevte hlub\u0161\u00ed smysl symbol\u016f, praktik a duchovn\u00edch koncept\u016f.'
      );
      setMetaByProperty('og:title', 'Ezoterick\u00fd slovn\u00edk | Mystick\u00e1 Hv\u011bzda');
      setMetaByProperty(
        'og:description',
        'Komplexn\u00ed ezoterick\u00fd slovn\u00edk pojm\u016f z astrologie, tarotu, numerologie a spirituality.'
      );
      setHtml('.hero__title', 'Ezoterick\u00fd <span class="text-gradient">Slovn\u00edk</span>');
      setText(
        '.hero__subtitle',
        'Objevte v\u00fdznamy tajemn\u00fdch pojm\u016f z astrologie, tarotu, numerologie a dal\u0161\u00edch duchovn\u00edch sm\u011br\u016f.'
      );
    },

    'snar.html': () => {
      document.title = 'Sn\u00e1\u0159 | V\u00fdklad sn\u016f a lexikon symbol\u016f | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        'Lexikon sn\u016f a hlubok\u00fd snov\u00fd v\u00fdklad. Odhalte skryt\u00e9 poselstv\u00ed va\u0161eho podv\u011bdom\u00ed a rozkl\u00ed\u010dujte v\u00fdznam snov\u00fdch symbol\u016f.'
      );
      setMetaByProperty('og:title', 'Sn\u00e1\u0159 | V\u00fdklad sn\u016f a lexikon symbol\u016f | Mystick\u00e1 Hv\u011bzda');
      setMetaByProperty(
        'og:description',
        'Rozlu\u0161t\u011b v\u00fdznamy sn\u016f zdarma. Lexikon symbol\u016f i hlubok\u00fd osobn\u00ed v\u00fdklad cel\u00e9ho snu.'
      );
      setText(
        '.hero__subtitle',
        'Rozlu\u0161t\u011b poselstv\u00ed sv\u00fdch sn\u016f. Prozkoumejte lexikon symbol\u016f nebo si nechte vylo\u017eit sen do hloubky.'
      );
    },

    'tarot-zdarma.html': () => {
      document.title = 'Tarot v\u00fdklad zdarma online | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        'Bezplatn\u00fd tarotov\u00fd v\u00fdklad jako symbolick\u00fd r\u00e1mec pro reflexi, jasn\u011bj\u0161\u00ed ot\u00e1zku a jeden dal\u0161\u00ed krok. Bez registrace a bez platebn\u00ed karty.'
      );
      setMetaByProperty('og:title', 'Tarot v\u00fdklad zdarma online | Mystick\u00e1 Hv\u011bzda');
      setMetaByProperty(
        'og:description',
        'Vyberte si kartu nebo metodu a z\u00edskejte symbolick\u00fd vhled bez slibu pevn\u00e9 budoucnosti.'
      );
      setText('.section__title', 'Tarot v\u00fdklad zdarma online');
      setText(
        '.section__text',
        'Vyberte si kartu nebo metodu a odneste si jeden konkr\u00e9tn\u00ed dal\u0161\u00ed krok. Tarot je reflexn\u00ed r\u00e1mec, ne slib pevn\u00e9 budoucnosti.'
      );
    },

    'tarot-ano-ne.html': () => {
      document.title = 'Tarot ANO nebo NE | Okam\u017eit\u00e1 odpov\u011b\u010f zdarma | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        'Tarot ANO nebo NE: polo\u017ete svou ot\u00e1zku, vyberte kartu a z\u00edskejte okam\u017eitou odpov\u011b\u010f zdarma. Rychl\u00fd tarot online bez registrace.'
      );
      setMetaByProperty('og:title', 'Tarot ANO nebo NE | Okam\u017eit\u00e1 odpov\u011b\u010f | Mystick\u00e1 Hv\u011bzda');
      setMetaByProperty(
        'og:description',
        'Zeptejte se karet. ANO, NE nebo MO\u017dN\u00c1 s rychlou odpov\u011bd\u00ed zdarma.'
      );
      setText('.section__text', 'Formulujte svou ot\u00e1zku, soust\u0159e\u010fte se na ni a vyberte jednu kartu.');
    },

    'soukromi.html': () => {
      document.title = 'Ochrana soukrom\u00ed | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        'Ochrana osobn\u00edch \u00fadaj\u016f a z\u00e1sady soukrom\u00ed slu\u017eby Mystick\u00e1 Hv\u011bzda. Informace o zpracov\u00e1n\u00ed va\u0161ich dat podle GDPR.'
      );
      setMetaByProperty('og:title', 'Ochrana soukrom\u00ed | Mystick\u00e1 Hv\u011bzda');
      setMetaByProperty(
        'og:description',
        'Informace o zpracov\u00e1n\u00ed osobn\u00edch \u00fadaj\u016f slu\u017eby Mystick\u00e1 Hv\u011bzda.'
      );
      updateJsonLd(
        (data) => data?.url === 'https://www.mystickahvezda.cz/soukromi.html',
        {
          name: 'Z\u00e1sady soukrom\u00ed | Mystick\u00e1 Hv\u011bzda',
          description: 'Z\u00e1sady soukrom\u00ed a nakl\u00e1d\u00e1n\u00ed s osobn\u00edmi \u00fadaji na Mystick\u00e9 Hv\u011bzd\u011b.'
        }
      );
      setText('.skip-link', 'P\u0159esko\u010dit na obsah');
      setHtml('.hero__title .text-gradient', 'Ochrana soukrom\u00ed');
      setText('.hero__subtitle', 'Informace o zpracov\u00e1n\u00ed osobn\u00edch \u00fadaj\u016f');
    },

    'podminky.html': () => {
      document.title = 'Obchodn\u00ed podm\u00ednky | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        'V\u0161eobecn\u00e9 obchodn\u00ed podm\u00ednky slu\u017eby Mystick\u00e1 Hv\u011bzda. Pr\u00e1vn\u00ed informace o pou\u017e\u00edv\u00e1n\u00ed na\u0161ich astrologick\u00fdch slu\u017eeb.'
      );
      setMetaByProperty('og:title', 'Obchodn\u00ed podm\u00ednky | Mystick\u00e1 Hv\u011bzda');
      setMetaByProperty(
        'og:description',
        'V\u0161eobecn\u00e9 obchodn\u00ed podm\u00ednky slu\u017eby Mystick\u00e1 Hv\u011bzda.'
      );
      updateJsonLd(
        (data) => data?.url === 'https://www.mystickahvezda.cz/podminky.html',
        {
          name: 'Podm\u00ednky pou\u017eit\u00ed | Mystick\u00e1 Hv\u011bzda',
          description: 'Podm\u00ednky a pravidla pro pou\u017e\u00edv\u00e1n\u00ed platformy Mystick\u00e1 Hv\u011bzda.'
        }
      );
      setText('.skip-link', 'P\u0159esko\u010dit na obsah');
      setHtml('.hero__title .text-gradient', 'Obchodn\u00ed podm\u00ednky');
      setText('.hero__subtitle', 'V\u0161eobecn\u00e9 obchodn\u00ed podm\u00ednky slu\u017eby Mystick\u00e1 Hv\u011bzda');
    },

    'admin.html': () => {
      document.title = 'Admin dashboard | Mystick\u00e1 Hv\u011bzda';
    },

    'andelske-karty.html': () => {
      document.title = 'And\u011blsk\u00e1 karta dne | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        'Vyt\u00e1hn\u011bte si svou and\u011blskou kartu pro dne\u0161n\u00ed den. Jemn\u00e1 and\u011blsk\u00e1 podpora a poselstv\u00ed sv\u011btla pro va\u0161i du\u0161i.'
      );
      setMetaByProperty('og:title', 'And\u011blsk\u00e1 karta dne | Mystick\u00e1 Hv\u011bzda');
      setMetaByProperty(
        'og:description',
        'Zastavte se a nechte se v\u00e9st. Vyt\u00e1hn\u011bte si and\u011blskou kartu s laskav\u00fdm poselstv\u00edm.'
      );
    },

    'jak-to-funguje.html': () => {
      document.title = 'Jak to funguje | Mystick\u00e1 Hv\u011bzda';
      setMetaByProperty('og:title', 'Jak to funguje | Mystick\u00e1 Hv\u011bzda');
      setMetaByProperty(
        'og:description',
        'Jak z dat vznik\u00e1 symbolick\u00fd v\u00fdklad: v\u00fdpo\u010det r\u00e1mce, interpretace a jasn\u00e9 hranice slu\u017eby.'
      );
      updateJsonLd(
        (data) => data?.url === 'https://www.mystickahvezda.cz/jak-to-funguje.html',
        {
          name: 'Jak to funguje | Mystick\u00e1 Hv\u011bzda',
          description: 'Jak z dat vznik\u00e1 symbolick\u00fd v\u00fdklad: v\u00fdpo\u010det r\u00e1mce, interpretace a jasn\u00e9 hranice slu\u017eby.'
        }
      );
      setText('.hero__badge', 'Transparentn\u00ed cesta');
      setHtml('.hero__title .text-gradient', 'Jak to funguje');
      setText(
        '.hero__subtitle',
        'Ukazujeme, jak se ze zadan\u00fdch dat stane symbolick\u00fd v\u00fdklad: co po\u010d\u00edt\u00e1me, co interpretujeme a kde nech\u00e1v\u00e1me rozhodnut\u00ed na v\u00e1s.'
      );

      const processTitles = ['Zad\u00e1n\u00ed kontextu', 'V\u00fdpo\u010det r\u00e1mce', 'Srozumiteln\u00fd v\u00fdklad'];
      const processTexts = [
        'Zad\u00e1te datum, \u010das a m\u00edsto narozen\u00ed nebo ot\u00e1zku, se kterou p\u0159ich\u00e1z\u00edte. \u010c\u00edm konkr\u00e9tn\u011bj\u0161\u00ed kontext, t\u00edm l\u00e9pe se d\u00e1 v\u00fdklad ukotvit.',
        'Syst\u00e9m spo\u010d\u00edt\u00e1 astrologick\u00fd nebo karetn\u00ed r\u00e1mec a p\u0159iprav\u00ed symboly, se kter\u00fdmi se d\u00e1 poctiv\u011b pracovat. Nejde o pevn\u00fd osud ani garanci v\u00fdsledku.',
        'Dostanete \u010diteln\u00fd v\u00fdklad, kter\u00fd pojmenuje t\u00e9ma, nap\u011bt\u00ed a jeden dal\u0161\u00ed krok. Rozhodnut\u00ed z\u016fst\u00e1v\u00e1 na v\u00e1s.'
      ];
      document.querySelectorAll('.process-grid .process-card__title').forEach((title, index) => {
        if (processTitles[index]) title.textContent = processTitles[index];
      });
      document.querySelectorAll('.process-grid .process-card__text').forEach((text, index) => {
        if (processTexts[index]) text.textContent = processTexts[index];
      });

      setText('.tech-section .section__title', 'N\u00e1\u0161 p\u0159\u00edstup');
      setText('.tech-section .section__text', 'Co je v\u00fdpo\u010det, co je interpretace a co z\u016fst\u00e1v\u00e1 na v\u00e1s?');
      const techTitles = ['V\u00fdpo\u010det jako mapa', 'Interpretace se z\u00e1m\u011brem', 'Ochrana soukrom\u00ed', 'Etick\u00e9 hranice'];
      const techTexts = [
        'Datum, \u010das a m\u00edsto pom\u00e1haj\u00ed sestavit astrologick\u00fd r\u00e1mec. Neznamen\u00e1 to, \u017ee v\u00fdklad garantuje pevn\u00fd v\u00fdsledek.',
        'Symboly propojujeme s ot\u00e1zkou a kontextem tak, aby vznikl pou\u017eiteln\u00fd dal\u0161\u00ed krok, ne osudov\u00fd verdikt.',
        '\u00dadaje pou\u017e\u00edv\u00e1me pro fungov\u00e1n\u00ed \u00fa\u010dtu a vytvo\u0159en\u00ed v\u00fdklad\u016f. Platebn\u00ed \u00fadaje zpracov\u00e1v\u00e1 Stripe.',
        'V\u00fdklady maj\u00ed povzbudit a zp\u0159esnit ot\u00e1zku. Nenahrazuj\u00ed terapii, l\u00e9ka\u0159sk\u00e9, pr\u00e1vn\u00ed ani finan\u010dn\u00ed rozhodov\u00e1n\u00ed.'
      ];
      document.querySelectorAll('.tech-item').forEach((item, index) => {
        const title = item.querySelector('h4');
        const text = item.querySelector('.process-card__text');
        if (title && techTitles[index]) title.textContent = techTitles[index];
        if (text && techTexts[index]) text.textContent = techTexts[index];
      });
    },

    'rocni-horoskop.html': () => {
      document.title = 'Ro\u010dn\u00ed horoskop na m\u00edru 2026 | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        'Personalizovan\u00fd ro\u010dn\u00ed horoskop jako jednor\u00e1zov\u00e9 PDF: \u0161est oblast\u00ed \u017eivota, kl\u00ed\u010dov\u00e1 t\u00e9mata roku, m\u011bs\u00edce pro pozornost a praktick\u00e9 ot\u00e1zky k sebereflexi.'
      );
      setMetaByProperty('og:title', 'Ro\u010dn\u00ed horoskop na m\u00edru 2026 | Mystick\u00e1 Hv\u011bzda');
      setMetaByProperty(
        'og:description',
        'Jednor\u00e1zov\u00e9 PDF pro rok 2026: osobn\u00ed t\u00e9mata, oblasti \u017eivota a m\u011bs\u00edce, ke kter\u00fdm se m\u016f\u017ee\u0161 vracet.'
      );
    },

    'shamansko-kolo.html': () => {
      document.title = '\u0160amansk\u00e9 kolo | symbolick\u00fd totemov\u00fd v\u00fdklad | Mystick\u00e1 Hv\u011bzda';
      setMetaByName(
        'description',
        'Prozkoumejte symbolick\u00fd r\u00e1mec \u0160amansk\u00e9ho kola: m\u011bs\u00ed\u010dn\u00ed totem, sv\u011btovou stranu a \u017eivel podle data narozen\u00ed jako inspiraci k sebereflexi, ne jako pevn\u00e9 ur\u010den\u00ed identity.'
      );
      setMetaByProperty('og:title', '\u0160amansk\u00e9 kolo | symbolick\u00fd totemov\u00fd v\u00fdklad | Mystick\u00e1 Hv\u011bzda');
      setMetaByProperty(
        'og:description',
        'Zjist\u011bte sv\u016fj m\u011bs\u00ed\u010dn\u00ed totem, sv\u011btovou stranu a \u017eivel jako symbolick\u00fd r\u00e1mec pro sebereflexi. V\u00fdklad je inspirac\u00ed, ne pevnou p\u0159edpov\u011bd\u00ed ani kulturn\u00edm n\u00e1rokem.'
      );
      setMetaByProperty('og:site_name', 'Mystick\u00e1 Hv\u011bzda');
      updateJsonLd(
        (data) => data?.url === 'https://www.mystickahvezda.cz/shamansko-kolo.html',
        {
          name: '\u0160amansk\u00e9 kolo | symbolick\u00fd totemov\u00fd v\u00fdklad',
          description: 'Symbolick\u00fd r\u00e1mec \u0160amansk\u00e9ho kola pro m\u011bs\u00ed\u010dn\u00ed totem, sv\u011btovou stranu, \u017eivel a sebereflexi.'
        }
      );
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const applyFixes = fixes[path];
    if (applyFixes) applyFixes();
  });
})();
