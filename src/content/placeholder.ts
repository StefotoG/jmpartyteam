import type { SiteContent } from '../lib/types';

/**
 * Seed content. Doubles as the local fallback when Sanity is not configured and as
 * the input for the Sanity seed script, so both stay in sync.
 *
 * Copy is deliberately realistic Bulgarian and English of production-like length —
 * lorem ipsum hides the wrapping and overflow bugs that Cyrillic actually causes.
 */
export const placeholderContent: SiteContent = {
  settings: {
    isPlaceholder: true,
    brandName: 'JM Party Team',
    phonePrimary: '+359 88 000 0000',
    phoneSecondary: '+359 88 111 1111',
    viber: '+359880000000',
    whatsapp: '+359880000000',
    email: 'jmpartyteam@gmail.com',
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    tiktok: 'https://tiktok.com/',
    cities: {
      bg: ['София', 'Пловдив', 'Варна', 'Бургас', 'Стара Загора', 'Русе'],
      en: ['Sofia', 'Plovdiv', 'Varna', 'Burgas', 'Stara Zagora', 'Ruse'],
    },
    addressLocality: { bg: 'София', en: 'Sofia' },
    foundingYear: 2016,
    eventsCompleted: 450,
  },

  services: [
    {
      isPlaceholder: true,
      key: 'weddings',
      order: 1,
      image: '/placeholders/weddings.svg',
      slug: { bg: 'svatbi', en: 'weddings' },
      title: { bg: 'Сватби', en: 'Weddings' },
      summary: {
        bg: 'Музика и озвучаване за целия ден — от изнесения ритуал до последния танц на дансинга.',
        en: 'Music and sound for the whole day — from the outdoor ceremony to the last dance of the night.',
      },
      body: {
        bg: [
          'Сватбата е един ден, който не може да се повтори, затова подхождаме към нея с подготовка, а не с импровизация. Срещаме се с вас предварително, за да чуем какво обичате да слушате и кои песни задължително трябва да звучат.',
          'Осигуряваме озвучаване за ритуала, фонова музика по време на вечерята и пълна програма за дансинга. Работим в синхрон с водещия, фотографа и екипа на залата, за да няма паузи и изненади.',
        ],
        en: [
          'A wedding happens once, so we prepare for it rather than improvise. We meet you beforehand to learn what you listen to and which songs absolutely have to be played.',
          'We provide sound for the ceremony, background music through dinner and a full dancefloor programme. We work in sync with your host, photographer and venue team so there are no gaps and no surprises.',
        ],
      },
      inclusions: {
        bg: [
          'Професионално озвучаване за до 200 гости',
          'Безжични микрофони за ритуала и тостовете',
          'Осветление за дансинга',
          'Предварителна среща и съгласуван плейлист',
          'Резервна техника на място',
        ],
        en: [
          'Professional sound for up to 200 guests',
          'Wireless microphones for the ceremony and toasts',
          'Dancefloor lighting',
          'Planning meeting and an agreed playlist',
          'Backup equipment on site',
        ],
      },
    },
    {
      isPlaceholder: true,
      key: 'proms',
      order: 2,
      image: '/placeholders/proms.svg',
      slug: { bg: 'abiturientski-balove', en: 'proms' },
      title: { bg: 'Абитуриентски балове', en: 'Prom nights' },
      summary: {
        bg: 'Енергия от първата до последната песен — музиката, която класът наистина слуша.',
        en: 'Energy from the first track to the last — the music the class actually listens to.',
      },
      body: {
        bg: [
          'Абитуриентският бал е вечерта, за която се говори години напред. Подготвяме програмата заедно с представители на класа, за да сме сигурни, че звучи това, което всички чакат.',
          'Държим здрав контрол над нивата на звука и работим коректно с ресторанта и родителите, така че купонът да е силен, но вечерта да мине без проблеми.',
        ],
        en: [
          'Prom night is the evening people talk about for years. We build the programme together with class representatives so the music is exactly what everyone is waiting for.',
          'We keep sound levels under control and work properly with the venue and the parents, so the party is loud but the evening stays trouble-free.',
        ],
      },
      inclusions: {
        bg: [
          'Озвучаване за зала до 300 души',
          'LED осветление и ефекти',
          'Микрофон за речи и награждаване',
          'Съгласуван плейлист с класа',
          'Диджей на живо през цялата вечер',
        ],
        en: [
          'Sound for venues up to 300 people',
          'LED lighting and effects',
          'Microphone for speeches and awards',
          'Playlist agreed with the class',
          'Live DJ throughout the evening',
        ],
      },
    },
    {
      isPlaceholder: true,
      key: 'corporate',
      order: 3,
      image: '/placeholders/corporate.svg',
      slug: { bg: 'korporativni-sabitiya', en: 'corporate-events' },
      title: { bg: 'Корпоративни събития', en: 'Corporate events' },
      summary: {
        bg: 'Коледни партита, тиймбилдинги и годишнини — с техника и екип, на които можете да разчитате.',
        en: 'Christmas parties, team buildings and anniversaries — with equipment and a team you can rely on.',
      },
      body: {
        bg: [
          'Корпоративните събития изискват точност. Идваме рано, тестваме всичко предварително и се съобразяваме с програмата на организатора до минута.',
          'Осигуряваме озвучаване за презентации и награждавания, а след официалната част преминаваме плавно към музиката за танци.',
        ],
        en: [
          'Corporate events demand precision. We arrive early, test everything in advance and follow the organiser\u2019s run sheet to the minute.',
          'We provide sound for presentations and awards, then move smoothly from the formal part into the dancing.',
        ],
      },
      inclusions: {
        bg: [
          'Озвучаване за презентации и речи',
          'Диджей програма след официалната част',
          'Фонова музика за коктейл',
          'Издаване на фактура',
          'Застрахована техника',
        ],
        en: [
          'Sound for presentations and speeches',
          'DJ programme after the formal part',
          'Background music for the cocktail hour',
          'Invoice provided',
          'Insured equipment',
        ],
      },
    },
    {
      isPlaceholder: true,
      key: 'birthdays',
      order: 4,
      image: '/placeholders/birthdays.svg',
      slug: { bg: 'rozhdeni-dni', en: 'birthdays' },
      title: { bg: 'Рождени дни', en: 'Birthday parties' },
      summary: {
        bg: 'От камерно парти вкъщи до голямо тържество в ресторант.',
        en: 'From a small party at home to a large celebration at a restaurant.',
      },
      body: {
        bg: [
          'Всеки рожден ден е различен и затова не работим с еднакъв шаблон. Питаме кого каните, каква музика слуша рожденикът и колко силно искате да се танцува.',
          'Разполагаме с компактна техника за малки пространства и мощна система за големи зали.',
        ],
        en: [
          'Every birthday is different, so we do not work from a single template. We ask who is coming, what the birthday person listens to and how much dancing you want.',
          'We have compact equipment for small spaces and a powerful system for larger venues.',
        ],
      },
      inclusions: {
        bg: [
          'Озвучаване според размера на помещението',
          'Музика по заявка на гостите',
          'Микрофон за поздравления',
          'Осветление по избор',
        ],
        en: [
          'Sound scaled to the size of the room',
          'Guest song requests',
          'Microphone for toasts',
          'Optional lighting',
        ],
      },
    },
    {
      isPlaceholder: true,
      key: 'anniversaries',
      order: 5,
      image: '/placeholders/anniversaries.svg',
      slug: { bg: 'yubilei-i-pensionirane', en: 'anniversaries-retirement' },
      title: { bg: 'Юбилеи и пенсиониране', en: 'Anniversaries & retirement' },
      summary: {
        bg: 'Музика през десетилетията — за гости на всякаква възраст.',
        en: 'Music across the decades — for guests of every age.',
      },
      body: {
        bg: [
          'Когато на едно събитие има три поколения, изборът на музика е най-важното решение. Знаем кога да пуснем нещо познато и кога да вдигнем нивото.',
          'Помагаме и с организацията на момента с речите и подаръците, за да протече спокойно и без суетене.',
        ],
        en: [
          'When three generations are in the same room, music choice is the most important decision. We know when to play something familiar and when to lift the energy.',
          'We also help stage the speeches and gifts so that part of the evening runs calmly.',
        ],
      },
      inclusions: {
        bg: [
          'Музика от 60-те до днес',
          'Умерена сила на звука за разговори',
          'Микрофон за речи',
          'Помощ с програмата на вечерта',
        ],
        en: [
          'Music from the 1960s to today',
          'Moderate volume so guests can talk',
          'Microphone for speeches',
          'Help planning the run of the evening',
        ],
      },
    },
    {
      isPlaceholder: true,
      key: 'christenings',
      order: 6,
      image: '/placeholders/christenings.svg',
      slug: { bg: 'krashteneta', en: 'christenings' },
      title: { bg: 'Кръщенета', en: 'Christenings' },
      summary: {
        bg: 'Спокойна музика за семейния обяд и весела програма за децата.',
        en: 'Calm music for the family lunch and a cheerful programme for the children.',
      },
      body: {
        bg: [
          'Кръщенето събира цялото семейство, често с много деца. Поддържаме приятен фон по време на храненето и оставяме музиката да се засили едва след това.',
          'Съобразяваме силата на звука с най-малките гости — това е детайл, който родителите винаги оценяват.',
        ],
        en: [
          'A christening brings the whole family together, often with a lot of children. We keep a pleasant background during the meal and only lift the music afterwards.',
          'We keep the volume appropriate for the youngest guests — a detail parents always appreciate.',
        ],
      },
      inclusions: {
        bg: [
          'Фонова музика за обяда',
          'Детска програма с песни и игри',
          'Микрофон за кръстниците',
          'Контролирана сила на звука',
        ],
        en: [
          'Background music through lunch',
          'Children\u2019s programme with songs and games',
          'Microphone for the godparents',
          'Carefully controlled volume',
        ],
      },
    },
  ],

  packages: [
    {
      isPlaceholder: true,
      key: 'basic',
      priceEur: 450,
      isFrom: true,
      highlighted: false,
      name: { bg: 'Основен', en: 'Essential' },
      features: {
        bg: [
          'До 5 часа диджей програма',
          'Озвучаване за до 80 гости',
          'Един безжичен микрофон',
          'Съгласуван плейлист',
        ],
        en: [
          'Up to 5 hours of DJ time',
          'Sound for up to 80 guests',
          'One wireless microphone',
          'Agreed playlist',
        ],
      },
    },
    {
      isPlaceholder: true,
      key: 'standard',
      priceEur: 750,
      isFrom: true,
      highlighted: true,
      name: { bg: 'Стандартен', en: 'Standard' },
      features: {
        bg: [
          'До 8 часа диджей програма',
          'Озвучаване за до 150 гости',
          'Два безжични микрофона',
          'Осветление за дансинга',
          'Предварителна среща',
          'Резервна техника на място',
        ],
        en: [
          'Up to 8 hours of DJ time',
          'Sound for up to 150 guests',
          'Two wireless microphones',
          'Dancefloor lighting',
          'Planning meeting',
          'Backup equipment on site',
        ],
      },
    },
    {
      isPlaceholder: true,
      key: 'premium',
      priceEur: 1200,
      isFrom: true,
      highlighted: false,
      name: { bg: 'Премиум', en: 'Premium' },
      features: {
        bg: [
          'Цял ден на разположение',
          'Озвучаване за до 300 гости',
          'Озвучаване на изнесен ритуал',
          'Пълно сценично осветление',
          'Двама диджеи в екипа',
          'Тежък дим за първи танц',
          'Резервна техника на място',
        ],
        en: [
          'Available for the full day',
          'Sound for up to 300 guests',
          'Sound for an outdoor ceremony',
          'Full stage lighting',
          'Two DJs on the team',
          'Low fog for the first dance',
          'Backup equipment on site',
        ],
      },
    },
  ],

  addons: [
    {
      isPlaceholder: true,
      key: 'photo-booth',
      priceEur: 250,
      isFrom: true,
      name: { bg: 'Фотокабина', en: 'Photo booth' },
    },
    {
      isPlaceholder: true,
      key: 'led-letters',
      priceEur: 120,
      isFrom: true,
      name: { bg: 'LED букви', en: 'LED letters' },
    },
    {
      isPlaceholder: true,
      key: 'heavy-fog',
      priceEur: 90,
      isFrom: false,
      name: { bg: 'Тежък дим за първи танц', en: 'Low fog for the first dance' },
    },
    {
      isPlaceholder: true,
      key: 'lasers',
      priceEur: 150,
      isFrom: true,
      name: { bg: 'Лазерно шоу', en: 'Laser show' },
    },
    {
      isPlaceholder: true,
      key: 'confetti',
      priceEur: 80,
      isFrom: false,
      name: { bg: 'Конфети оръдия', en: 'Confetti cannons' },
    },
    {
      isPlaceholder: true,
      key: 'extra-hour',
      priceEur: 70,
      isFrom: false,
      name: { bg: 'Допълнителен час', en: 'Additional hour' },
    },
  ],

  gallery: Array.from({ length: 12 }, (_, index) => {
    const serviceKeys = [
      'weddings',
      'proms',
      'corporate',
      'birthdays',
      'anniversaries',
      'christenings',
    ];
    const serviceKey = serviceKeys[index % serviceKeys.length]!;
    const portrait = index % 3 === 1;
    return {
      isPlaceholder: true,
      key: `gallery-${index + 1}`,
      image: `/placeholders/gallery-${index + 1}.svg`,
      serviceKey,
      width: portrait ? 800 : 1200,
      height: portrait ? 1200 : 800,
      alt: {
        bg: 'Примерна снимка — ще бъде заменена с реална снимка от събитие',
        en: 'Placeholder image — to be replaced with a real event photo',
      },
    };
  }),

  mixes: [
    {
      isPlaceholder: true,
      key: 'wedding-mix',
      title: 'Wedding Dancefloor Mix',
      platform: 'mixcloud',
      embedUrl: '',
      durationMinutes: 62,
      genres: {
        bg: ['Поп', 'Денс', 'Български хитове'],
        en: ['Pop', 'Dance', 'Bulgarian hits'],
      },
    },
    {
      isPlaceholder: true,
      key: 'party-mix',
      title: 'Party Starter Mix',
      platform: 'mixcloud',
      embedUrl: '',
      durationMinutes: 48,
      genres: {
        bg: ['Хаус', 'Ретро', 'Хип-хоп'],
        en: ['House', 'Retro', 'Hip-hop'],
      },
    },
    {
      isPlaceholder: true,
      key: 'retro-mix',
      title: 'Retro Night 80s & 90s',
      platform: 'mixcloud',
      embedUrl: '',
      durationMinutes: 55,
      genres: {
        bg: ['80-те', '90-те', 'Диско'],
        en: ['80s', '90s', 'Disco'],
      },
    },
  ],

  testimonials: [
    {
      isPlaceholder: true,
      key: 't1',
      author: 'Мария и Ивайло',
      serviceKey: 'weddings',
      date: '2025-09-14',
      rating: 5,
      quote: {
        bg: 'Дансингът беше пълен от първата до последната песен. Момчетата усетиха настроението на гостите и нито веднъж не се наложи да им казваме какво да пуснат.',
        en: 'The dancefloor was full from the first song to the last. They read the room perfectly and we never once had to tell them what to play.',
      },
    },
    {
      isPlaceholder: true,
      key: 't2',
      author: 'Елена',
      serviceKey: 'corporate',
      date: '2025-12-06',
      rating: 5,
      quote: {
        bg: 'Организирахме коледно парти за 180 души. Дойдоха два часа по-рано, тестваха всичко и официалната част мина безупречно.',
        en: 'We organised a Christmas party for 180 people. They arrived two hours early, tested everything and the formal part went flawlessly.',
      },
    },
    {
      isPlaceholder: true,
      key: 't3',
      author: 'Клас 12 „В“',
      serviceKey: 'proms',
      date: '2025-05-24',
      rating: 5,
      quote: {
        bg: 'Съгласувахме плейлиста предварително и вечерта беше точно каквато си я представяхме. Препоръчваме ги на всички класове след нас.',
        en: 'We agreed the playlist in advance and the night was exactly what we imagined. We recommend them to every class after us.',
      },
    },
    {
      isPlaceholder: true,
      key: 't4',
      author: 'Георги',
      serviceKey: 'anniversaries',
      date: '2025-07-19',
      rating: 5,
      quote: {
        bg: 'Юбилей на баща ми със 70 гости на възраст от 8 до 85. Успяха да намерят музика, на която танцуваха абсолютно всички.',
        en: 'My father\u2019s anniversary with 70 guests aged 8 to 85. They found music that absolutely everyone danced to.',
      },
    },
  ],

  faqs: [
    {
      isPlaceholder: true,
      key: 'f1',
      question: {
        bg: 'Колко предварително трябва да запазим дата?',
        en: 'How far in advance should we book?',
      },
      answer: {
        bg: 'За сватби в активния сезон между май и септември препоръчваме 8 до 12 месеца предварително. За други събития обикновено 2 до 3 месеца са достатъчни.',
        en: 'For weddings in the busy season between May and September we recommend 8 to 12 months ahead. For other events, 2 to 3 months is usually enough.',
      },
    },
    {
      isPlaceholder: true,
      key: 'f2',
      question: {
        bg: 'Можем ли да изберем песните?',
        en: 'Can we choose the songs?',
      },
      answer: {
        bg: 'Да. Преди събитието изготвяме заедно списък със задължителни песни и списък с песни, които не искате да звучат. Останалото четем по реакцията на дансинга.',
        en: 'Yes. Before the event we build a must-play list and a do-not-play list together. The rest we read from the dancefloor.',
      },
    },
    {
      isPlaceholder: true,
      key: 'f3',
      question: {
        bg: 'Пътувате ли извън София?',
        en: 'Do you travel outside Sofia?',
      },
      answer: {
        bg: 'Да, работим в цялата страна. За събития на повече от 100 км се начислява транспортна такса, която уточняваме предварително.',
        en: 'Yes, we work across the country. For events more than 100 km away there is a travel fee, agreed in advance.',
      },
    },
    {
      isPlaceholder: true,
      key: 'f4',
      question: {
        bg: 'Какво се случва, ако техниката се повреди?',
        en: 'What happens if equipment fails?',
      },
      answer: {
        bg: 'Носим резервен контролер, резервен микрофон и резервно захранване на всяко събитие. Досега не сме прекъсвали програма.',
        en: 'We bring a backup controller, a backup microphone and backup power to every event. We have never had to stop a programme.',
      },
    },
    {
      isPlaceholder: true,
      key: 'f5',
      question: {
        bg: 'Как се потвърждава резервацията?',
        en: 'How is a booking confirmed?',
      },
      answer: {
        bg: 'След уточняване на детайлите подписваме договор и се заплаща депозит. Датата се счита за запазена след получаване на депозита.',
        en: 'Once the details are agreed we sign a contract and a deposit is paid. The date is held once the deposit is received.',
      },
    },
  ],
};
