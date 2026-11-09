/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * تكامل مزود "Check UID" (check-uid.com) للتحقق من معرّف/اسم اللاعب — يغطي كل الألعاب
 * والتطبيقات المدعومة من المزود (بما فيها Free Fire بنسخه المتعددة عبر هذا المزود الجديد).
 * ملاحظة: نظام Free Fire القديم المستقل بمفتاحه الخاص (slug: "freefire") يبقى كما هو دون أي تغيير.
 * مفتاح واحد فقط (Authorization: Bearer) يُستخدم لكل هذه الألعاب مجتمعة.
 */

export interface VolseverGameDef {
  slug: string;       // معرف اللعبة في مزود Check UID (يُستخدم في الرابط)
  label: string;       // الاسم المعروض
  category: string;    // تصنيف للفلترة في لوحة التحكم
  hasZone: boolean;    // هل تتطلب اللعبة منطقة/سيرفر؟
  zoneType?: "input" | "dropdown"; // نوع إدخال المنطقة إن وُجدت
}

// قائمة الألعاب والتطبيقات المدعومة من Check UID (263 عنصراً، شاملة Free Fire بنسخه المتعددة)
export const VOLSEVER_GAMES: VolseverGameDef[] = [
  { slug: "league-of-legends-sg", label: "[SG] League of Legends", category: "موبا (MOBA)", hasZone: false },
  { slug: "league-of-legends-wild-rift-sg", label: "[SG] League of Legends: Wild Rift", category: "موبا (MOBA)", hasZone: false },
  { slug: "valorant-sg", label: "[SG] VALORANT", category: "باتل رويال", hasZone: false },
  { slug: "4fun-chat", label: "4Fun Chat", category: "دردشة وبث", hasZone: false },
  { slug: "8-ball-pool", label: "8 Ball Pool", category: "ألعاب أخرى", hasZone: false },
  { slug: "ace-racer", label: "Ace Racer", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "afk-journey", label: "AFK Journey", category: "ألعاب أخرى", hasZone: false },
  { slug: "age-of-empires-mobile", label: "Age of Empires Mobile", category: "ألعاب أخرى", hasZone: false },
  { slug: "among-heroes-fantasy-samkok", label: "Among Heroes: Fantasy Samkok", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "arena-breakout", label: "Arena Breakout", category: "باتل رويال", hasZone: false },
  { slug: "arena-breakout-infinite", label: "Arena Breakout: Infinite", category: "باتل رويال", hasZone: false },
  { slug: "arena-mania-magic-heroes", label: "Arena Mania: Magic Heroes", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "arena-of-valor-indonesia", label: "Arena of Valor", category: "موبا (MOBA)", hasZone: false },
  { slug: "astral-guardians-cyber-fantasy", label: "Astral Guardians: Cyber Fantasy", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "au2-mobile-hk", label: "AU2 موبايل (HK) (AU2 Mobile (HK))", category: "ألعاب أخرى", hasZone: false },
  { slug: "au2-mobile", label: "AU2 Mobile 2", category: "ألعاب أخرى", hasZone: false },
  { slug: "auto-chess", label: "Auto Chess", category: "ألعاب أخرى", hasZone: false },
  { slug: "azal-live", label: "Azal Live", category: "دردشة وبث", hasZone: false },
  { slug: "azur-lane", label: "Azur Lane", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "banishers-faiths-entwined", label: "Banishers: Faiths Entwined", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "basketrio", label: "Basketrio", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "battle-through-the-heavens-3d-fight", label: "Battle Through the Heavens 3D: Fight", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "be-the-king-judge-destiny", label: "Be The King: Judge Destiny", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "bella-chat", label: "Bella Chat", category: "دردشة وبث", hasZone: false },
  { slug: "bermuda", label: "Bermuda", category: "ألعاب أخرى", hasZone: false },
  { slug: "bigo-live", label: "Bigo Live 2", category: "دردشة وبث", hasZone: false },
  { slug: "blockman-go", label: "Blockman Go", category: "ألعاب أخرى", hasZone: false },
  { slug: "blood-strike", label: "Blood Strike", category: "باتل رويال", hasZone: true, zoneType: "input" },
  { slug: "blood-strike-max", label: "Blood سترايك ماكس (MENA) (Blood Strike Max (MENA))", category: "باتل رويال", hasZone: true, zoneType: "input" },
  { slug: "brawl-stars", label: "Brawl Stars", category: "ألعاب أخرى", hasZone: false },
  { slug: "codm", label: "Call of Duty Mobile", category: "باتل رويال", hasZone: false },
  { slug: "call-of-duty-mobile-indonesia", label: "Call of Duty Mobile", category: "باتل رويال", hasZone: false },
  { slug: "codm-garena", label: "Call of Duty Mobile", category: "باتل رويال", hasZone: false },
  { slug: "captain-tsubasa-dream-team", label: "Captain Tsubasa: Dream Team", category: "ألعاب أخرى", hasZone: false },
  { slug: "chamet", label: "Chamet", category: "دردشة وبث", hasZone: false },
  { slug: "mobile-legends-wr", label: "فحص منطقة MLBB (Fast, Work) (Check Region MLBB (Fast, Work))", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "mobile-legends", label: "فحص منطقة MLBB (Fast, Work) (Check Region MLBB (Fast, Work))", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "clash-of-clans", label: "Clash of Clans", category: "ألعاب أخرى", hasZone: false },
  { slug: "clash-royale", label: "Clash Royale", category: "ألعاب أخرى", hasZone: false },
  { slug: "cloud-song-saga-of-skywalkers", label: "Cloud Song: Saga of Skywalkers", category: "ألعاب أخرى", hasZone: false },
  { slug: "colorbang", label: "ColorBANG", category: "ألعاب أخرى", hasZone: false },
  { slug: "conquer-online-mobile", label: "Conquer Online Mobile", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "conquer-online-pc", label: "Conquer Online PC", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "cooking-adventure", label: "Cooking Adventure", category: "ألعاب أخرى", hasZone: false },
  { slug: "crasher-origin", label: "Crasher Origin", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "crisis-action", label: "Crisis Action", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "crossfire-legends", label: "Crossfire Legends", category: "ألعاب أخرى", hasZone: false },
  { slug: "culinary-tour", label: "Culinary Tour", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "dazz-live", label: "Dazz Live", category: "دردشة وبث", hasZone: false },
  { slug: "dead-target-zombie-games-3d", label: "DEAD TARGET: Zombie Games 3D", category: "ألعاب أخرى", hasZone: false },
  { slug: "delta-force", label: "Delta Force", category: "ألعاب أخرى", hasZone: false },
  { slug: "delta-force-garena", label: "Delta Force", category: "ألعاب أخرى", hasZone: false },
  { slug: "destiny-rising", label: "Destiny: Rising", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "diablo-immortal", label: "Diablo: Immortal", category: "ألعاب أخرى", hasZone: false },
  { slug: "dragon-city", label: "Dragon City", category: "ألعاب أخرى", hasZone: false },
  { slug: "dragon-hunters-heroes-legends", label: "Dragon Hunters: Heroes Legends", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "dragon-nest-m-classic", label: "Dragon Nest M: Classic", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "dragon-raja", label: "Dragon Raja", category: "ألعاب أخرى", hasZone: false },
  { slug: "dragonheir-silent-gods", label: "Dragonheir: Silent Gods", category: "ألعاب أخرى", hasZone: false },
  { slug: "dream-and-the-lethe-record", label: "Dream and the Lethe Record", category: "ألعاب أخرى", hasZone: false },
  { slug: "dunk-city-dynasty", label: "Dunk City Dynasty", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "ea-sports-fc-mobile-indonesia", label: "EA SPORTS FC™ Mobile", category: "ألعاب أخرى", hasZone: false },
  { slug: "echocalypse", label: "Echocalypse", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "eggy-party", label: "Eggy Party", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "elemental-titans-3d-idle-arena", label: "Elemental Titans: 3D Idle Arena", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "embers-last-duel", label: "Embers: Last Duel", category: "ألعاب أخرى", hasZone: false },
  { slug: "entropy-2099", label: "Entropy 2099", category: "ألعاب أخرى", hasZone: false },
  { slug: "era-of-celestials", label: "Era of Celestials", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "eternal-evolution", label: "Eternal Evolution", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "eve-echoes", label: "EVE Echoes", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "food-fantasy-crystal", label: "Food Fantasy Crystal", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "football-dream-be-a-pro", label: "Football Dream: Be A Pro", category: "ألعاب أخرى", hasZone: false },
  { slug: "football-master-2", label: "Football Master 2", category: "ألعاب أخرى", hasZone: false },
  { slug: "forsakenworld-2", label: "ForsakenWorld 2", category: "ألعاب أخرى", hasZone: false },
  { slug: "free-fire-asia", label: "Free Fire Asia Region", category: "باتل رويال", hasZone: false },
  { slug: "free-fire-asia-ws", label: "Free Fire Asia Stats", category: "باتل رويال", hasZone: false },
  { slug: "free-fire-eu", label: "Free Fire EU Region", category: "باتل رويال", hasZone: false },
  { slug: "free-fire-eu-ws", label: "Free Fire EU Stats", category: "باتل رويال", hasZone: false },
  { slug: "free-fire-global", label: "Free Fire Global Region", category: "باتل رويال", hasZone: false },
  { slug: "free-fire-global-ws", label: "Free Fire Global Stats", category: "باتل رويال", hasZone: false },
  { slug: "free-fire-india", label: "Free Fire India Region", category: "باتل رويال", hasZone: false },
  { slug: "free-fire-india-ws", label: "Free Fire India Stats", category: "باتل رويال", hasZone: false },
  { slug: "free-fire-latam-discount", label: "Free Fire LATAM Discount", category: "باتل رويال", hasZone: false },
  { slug: "free-fire-mena", label: "Free Fire MENA Region", category: "باتل رويال", hasZone: false },
  { slug: "free-fire-mena-ws", label: "Free Fire MENA Stats", category: "باتل رويال", hasZone: false },
  { slug: "free-fire-products-bo", label: "Free Fire Products", category: "باتل رويال", hasZone: false },
  { slug: "free-fire-ru", label: "Free Fire RU Region", category: "باتل رويال", hasZone: false },
  { slug: "free-fire-ru-ws", label: "Free Fire RU Stats", category: "باتل رويال", hasZone: false },
  { slug: "free-fire-indonesia", label: "Free Fire Top-up", category: "باتل رويال", hasZone: false },
  { slug: "free-fire-us", label: "Free Fire US Region", category: "باتل رويال", hasZone: false },
  { slug: "free-fire-us-ws", label: "Free Fire US Stats", category: "باتل رويال", hasZone: false },
  { slug: "frost-war-survival", label: "FROST WAR: SURVIVAL", category: "ألعاب أخرى", hasZone: false },
  { slug: "genshin-impact-cd", label: "Genshin Impact", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "genshin-impact", label: "Genshin Impact Global", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "free-fire-get-session-key-sg", label: "Get Session Key فري فاير SG & MY) (Get Session Key Free Fire SG & MY))", category: "باتل رويال", hasZone: false },
  { slug: "ghost-story-love-destiny", label: "Ghost Story: Love Destiny", category: "ألعاب أخرى", hasZone: false },
  { slug: "girls-connect-idle-rpg", label: "Girls' Connect", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "goddes-victory-nikke", label: "Goddes Victory: Nikke (FAST) (Goddes Victory: Nikke (FAST))", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "gogo-live", label: "GOGO LIVE", category: "دردشة وبث", hasZone: false },
  { slug: "golden-spatula", label: "Golden Spatula", category: "ألعاب أخرى", hasZone: false },
  { slug: "growtopia", label: "Growtopia", category: "ألعاب أخرى", hasZone: false },
  { slug: "hago", label: "Hago", category: "دردشة وبث", hasZone: false },
  { slug: "haikyu-fly-high", label: "HAIKYU!! FLY HIGH", category: "ألعاب أخرى", hasZone: false },
  { slug: "harry-potter-magic-awakened", label: "Harry Potter Magic Awakened", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "heaven-burns-red", label: "Heaven Burns Red", category: "ألعاب أخرى", hasZone: false },
  { slug: "heaven-domain-rebirth", label: "Heaven Domain: Rebirth", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "heroes-evolved", label: "Heroes Evolved", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "hiispii", label: "Hiispii", category: "ألعاب أخرى", hasZone: false },
  { slug: "honkai-impact-3", label: "Honkai Impact 3", category: "ألعاب أخرى", hasZone: false },
  { slug: "honkai-star-rail", label: "Honkai: Star Rail", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "honor-of-kings", label: "Honor of Kings 2 (Work Fast) (Honor of Kings 2 (Work Fast))", category: "موبا (MOBA)", hasZone: false },
  { slug: "hustle-castle", label: "Hustle Castle", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "identity-v", label: "Identity V", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "idle-legends", label: "Idle Legends", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "idol-party", label: "Idol Party", category: "ألعاب أخرى", hasZone: false },
  { slug: "ib-kr", label: "Infinite Borders-인피니트 보더스", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "infinite-lagrange", label: "Infinite Lagrange", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "isekai-feast-tales-of-recipes", label: "Isekai Feast: Tales of Recipes", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "jade-legends-immortal-realm", label: "Jade Legends: Immortal Realm", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "jawaker", label: "Jawaker", category: "ألعاب أخرى", hasZone: false },
  { slug: "joox", label: "Joox", category: "دردشة وبث", hasZone: false },
  { slug: "king-of-avalon", label: "King of Avalon", category: "ألعاب أخرى", hasZone: false },
  { slug: "kingshot", label: "KingShot (ED) (KingShot (ED))", category: "ألعاب أخرى", hasZone: false },
  { slug: "knives-out", label: "Knives Out", category: "باتل رويال", hasZone: true, zoneType: "input" },
  { slug: "lang-shinsangokushi", label: "Lang Shinsangokushi", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "laplace-m", label: "Laplace M", category: "ألعاب أخرى", hasZone: false },
  { slug: "last-island-of-survival", label: "Last Island of Survival", category: "باتل رويال", hasZone: false },
  { slug: "last-island-of-survival-lite", label: "Last Island of Survival Lite", category: "باتل رويال", hasZone: false },
  { slug: "league-of-legends", label: "League of Legends", category: "موبا (MOBA)", hasZone: false },
  { slug: "league-of-legends-wild-rift", label: "League of Legends: Wild Rift", category: "موبا (MOBA)", hasZone: false },
  { slug: "legend-of-mushroom-rush", label: "Legend of Mushroom: Rush", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "legends-of-runeterra", label: "Legends of Runeterra", category: "ألعاب أخرى", hasZone: false },
  { slug: "lemo-chat", label: "Lemo Chat", category: "دردشة وبث", hasZone: false },
  { slug: "lien-quan-mobile", label: "Liên Quân Mobile", category: "موبا (MOBA)", hasZone: false },
  { slug: "lifeafter", label: "Life After", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "life-makeover", label: "Life Makeover", category: "ألعاب أخرى", hasZone: false },
  { slug: "likee", label: "Likee", category: "دردشة وبث", hasZone: false },
  { slug: "lita", label: "Lita", category: "دردشة وبث", hasZone: false },
  { slug: "livu", label: "LivU", category: "دردشة وبث", hasZone: false },
  { slug: "lost-light", label: "Lost Light", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "love-and-deepspace", label: "Love and Deepspace", category: "ألعاب أخرى", hasZone: false },
  { slug: "lovebrush-chronicles", label: "Lovebrush Chronicles", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "ludo-world", label: "Ludo World", category: "ألعاب أخرى", hasZone: false },
  { slug: "machina-waking", label: "Machina Waking", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "magic-chess-go-go", label: "Magic Chess (Mobapay) (Magic Chess (Mobapay))", category: "تطبيقات", hasZone: true, zoneType: "input" },
  { slug: "mahjong-soul", label: "Mahjong Soul", category: "دردشة وبث", hasZone: false },
  { slug: "maplestory-m", label: "Maplestory M", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "marvel-duel", label: "MARVEL Duel", category: "ألعاب أخرى", hasZone: false },
  { slug: "marvel-rivals", label: "Marvel Rivals", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "mecha-break", label: "Mecha BREAK", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "metal-slug-awakening", label: "Metal Slug: Awakening", category: "ألعاب أخرى", hasZone: false },
  { slug: "meyo", label: "MeYo", category: "دردشة وبث", hasZone: false },
  { slug: "mico", label: "MICO: MAKE FRIENDS, LIVE CHAT", category: "دردشة وبث", hasZone: false },
  { slug: "mirage-perfect-skyline", label: "Mirage: Perfect Skyline", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "mixu", label: "Mixu", category: "دردشة وبث", hasZone: false },
  { slug: "mob-rush", label: "MOB RUSH", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "mobile-legend-mp", label: "موبايل ليجيندز (Mobapay) (Mobile Legends (Mobapay))", category: "موبا (MOBA)", hasZone: true, zoneType: "input" },
  { slug: "mobile-legends-adventure", label: "Mobile Legends: Adventure", category: "موبا (MOBA)", hasZone: true, zoneType: "input" },
  { slug: "mobile-legends-indonesia", label: "Mobile Legends: Bang Bang", category: "موبا (MOBA)", hasZone: true, zoneType: "input" },
  { slug: "modern-strike-online", label: "Modern Strike Online", category: "ألعاب أخرى", hasZone: false },
  { slug: "moonlight-blade-m", label: "Moonlight Blade M", category: "ألعاب أخرى", hasZone: false },
  { slug: "mu-origin-2", label: "MU Origin 2", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "mu-origin-3", label: "MU ORIGIN 3", category: "ألعاب أخرى", hasZone: false },
  { slug: "mythic-dawn-13-megami", label: "Mythic Dawn: 13 Megami", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "nba-infinite", label: "NBA Infinite", category: "ألعاب أخرى", hasZone: false },
  { slug: "nba-dunk-city", label: "NBAダンクシティ", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "nikke", label: "NIKKE", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "cotc-sea", label: "OCTOPATH TRAVELER: CotC", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "octopath-traveler-cotc", label: "OCTOPATH TRAVELER: CotC", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "olamet", label: "Olamet Chat", category: "دردشة وبث", hasZone: false },
  { slug: "once-human", label: "Once Human", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "one-punch-man-the-strongest", label: "ONE PUNCH MAN: The Strongest", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "onmyoji", label: "Onmyoji", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "onmyoji-arena", label: "Onmyoji Arena", category: "موبا (MOBA)", hasZone: false },
  { slug: "oxide-survival-island", label: "Oxide: Survival Island", category: "ألعاب أخرى", hasZone: false },
  { slug: "path-to-nowhere", label: "Path to Nowhere", category: "ألعاب أخرى", hasZone: false },
  { slug: "paw-tales-eternal-bond", label: "Paw Tales: Eternal Bond", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "phantom-blade-executioners", label: "Phantom Blade: Executioners", category: "ألعاب أخرى", hasZone: false },
  { slug: "pixel-gun-3d", label: "Pixel Gun 3D", category: "ألعاب أخرى", hasZone: false },
  { slug: "point-blank", label: "Point Blank", category: "ألعاب أخرى", hasZone: false },
  { slug: "pokemon-unite", label: "Pokémon Unite", category: "ألعاب أخرى", hasZone: false },
  { slug: "pool-city-8-ball", label: "Pool City 8 Ball", category: "ألعاب أخرى", hasZone: false },
  { slug: "poppo-live", label: "Poppo Live", category: "دردشة وبث", hasZone: false },
  { slug: "potato-hero-zombie-survival", label: "Potato Hero: Zombie Survival", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "pubg-mobile-global", label: "ببجي موبايل 3 (Global) (Work Fast) (PUBG Mobile 3 (Global) (Work Fast))", category: "باتل رويال", hasZone: false },
  { slug: "pubg-mobile-lite", label: "PUBG Mobile Lite", category: "باتل رويال", hasZone: false },
  { slug: "punishing-gray-raven", label: "Punishing: Gray Raven", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "pure-sniper", label: "Pure Sniper", category: "ألعاب أخرى", hasZone: false },
  { slug: "racing-master-cn", label: "Racing Master", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "racing-master-latam", label: "Racing Master LATAM", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "racing-master-na", label: "Racing Master NA", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "racing-master", label: "Racing Master SEA", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "ragnarok-m-eternal-love-big-cat-coin", label: "Ragnarok M: Eternal Love Big Cat Coin", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "ragnarok-origin", label: "Ragnarok Origin", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "ragnarok-x-next-generation", label: "Ragnarok X: Next Generation", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "revelation-infinite-journey", label: "Revelation: Infinite Journey", category: "ألعاب أخرى", hasZone: false },
  { slug: "rush-royale", label: "Rush Royale", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "saint-seiya-awakening", label: "Saint Seiya: Awakening", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "sausage-man", label: "Sausage Man", category: "باتل رويال", hasZone: true, zoneType: "input" },
  { slug: "scroll-of-onmyoji-sakura--sword", label: "Scroll of Onmyoji: Sakura & Sword", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "shining-nikki", label: "Shining Nikki", category: "ألعاب أخرى", hasZone: false },
  { slug: "snowbreak-containment-zone", label: "Snowbreak: Containment Zone", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "soul-chat", label: "Soul Chat", category: "دردشة وبث", hasZone: false },
  { slug: "soyo-chat", label: "Soyo Chat", category: "دردشة وبث", hasZone: false },
  { slug: "speed-drifters", label: "Speed Drifters", category: "ألعاب أخرى", hasZone: false },
  { slug: "starmaker", label: "StarMaker", category: "دردشة وبث", hasZone: false },
  { slug: "state-of-survival", label: "State of Survival", category: "ألعاب أخرى", hasZone: false },
  { slug: "stella-sora", label: "Stella Sora", category: "ألعاب أخرى", hasZone: false },
  { slug: "stumble-guys", label: "Stumble Guys", category: "ألعاب أخرى", hasZone: false },
  { slug: "sugo", label: "SUGO：Voice Live Chat Party", category: "دردشة وبث", hasZone: false },
  { slug: "summon-dragon-2", label: "Summon Dragon 2", category: "ألعاب أخرى", hasZone: false },
  { slug: "super-sus", label: "Super Sus", category: "ألعاب أخرى", hasZone: false },
  { slug: "sword-of-justice", label: "Sword of Justice", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "tada-chat", label: "Tada Chat", category: "دردشة وبث", hasZone: false },
  { slug: "talk-talk-chat", label: "Talk Talk Chat", category: "دردشة وبث", hasZone: false },
  { slug: "tamashi-rise-of-yokai", label: "Tamashi: Rise of Yokai", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "tami-chat", label: "Tami Chat", category: "دردشة وبث", hasZone: false },
  { slug: "tank-company", label: "Tank Company", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "teamfight-tactics-mobile", label: "Teamfight Tactics Mobile", category: "ألعاب أخرى", hasZone: false },
  { slug: "the-ants", label: "The Ants", category: "ألعاب أخرى", hasZone: false },
  { slug: "the-lord-of-the-rings-rise-to-war", label: "The Lord of the Rings: Rise to War", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "the-ninth-relic", label: "The Ninth Relic", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "the-return-of-condor-heroes", label: "The Return of Condor Heroes", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "thetan-arena", label: "Thetan Arena", category: "ألعاب أخرى", hasZone: false },
  { slug: "time-raiders", label: "Time Raiders", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "tom-and-jerry-chase", label: "Tom and Jerry Chase", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "top-eleven", label: "Top Eleven", category: "ألعاب أخرى", hasZone: false },
  { slug: "tumile", label: "Tumile", category: "ألعاب أخرى", hasZone: false },
  { slug: "undawn", label: "Undawn", category: "باتل رويال", hasZone: false },
  { slug: "utopia-origin", label: "Utopia Origin", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "valorant-indonesia", label: "VALORANT", category: "باتل رويال", hasZone: false },
  { slug: "waho-chat", label: "Waho Chat", category: "دردشة وبث", hasZone: false },
  { slug: "war-robots-frontiers", label: "War Robot Frontiers", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "war-robots", label: "War Robots", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "watcher-of-realms", label: "Watcher of Realms", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "wesing", label: "WeSing", category: "دردشة وبث", hasZone: false },
  { slug: "westward-adventure", label: "Westward Adventure", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "wetv", label: "WeTV", category: "دردشة وبث", hasZone: false },
  { slug: "where-winds-meet", label: "Where Winds Meet", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "whisper-of-shadow", label: "Whisper of Shadow", category: "ألعاب أخرى", hasZone: false },
  { slug: "whiteout-survival", label: "Whiteout Survival", category: "ألعاب أخرى", hasZone: false },
  { slug: "wild-hunter-goddess", label: "Wild Hunter: Goddess", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "world-war-heroes", label: "World War Heroes", category: "ألعاب أخرى", hasZone: false },
  { slug: "wuthering-waves", label: "Wuthering Waves", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "xena", label: "Xena Live Group Voice Chat", category: "دردشة وبث", hasZone: false },
  { slug: "yalla-ludo", label: "Yalla Ludo", category: "دردشة وبث", hasZone: false },
  { slug: "yalla-pay", label: "Yalla Pay", category: "دردشة وبث", hasZone: false },
  { slug: "yoho", label: "YOHO - GROUP VOICE CHAT", category: "دردشة وبث", hasZone: false },
  { slug: "yong-heroes", label: "Yong Heroes", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "you-star", label: "YouStar", category: "دردشة وبث", hasZone: false },
  { slug: "ys-6-mobile-vng", label: "YS 6 Mobile VNG", category: "ألعاب أخرى", hasZone: false },
  { slug: "zenless-zone-zero", label: "Zenless Zone Zero", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "zepeto", label: "ZEPETO", category: "ألعاب أخرى", hasZone: false },
  { slug: "racing-master-kr", label: "레이싱 마스터", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "armis", label: "아르미스", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "cotc-kr", label: "옥토패스 트래블러: 대륙의 패자", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "racing-master-jp", label: "レーシングマスター", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "here-to-everywhere", label: "世界之外", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "for-all-time", label: "時空中的繪旅人", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "dai-sangoku", label: "率土之濱-大三国志", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "nsh", label: "逆水寒港澳台", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "onmyoji-na", label: "陰陽師Onmyoji", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
  { slug: "onmyoji-jp", label: "陰陽師本格幻想RPG", category: "ألعاب أخرى", hasZone: true, zoneType: "input" },
];

export const VOLSEVER_GAME_MAP: Record<string, VolseverGameDef> = Object.fromEntries(
  VOLSEVER_GAMES.map((g) => [g.slug, g])
);

const CHECKUID_BASE_URL = "https://check-uid.com/api/v1";

/**
 * يُترجم أي خطأ فعلي يصل من مزوّد Check UID (غالباً إنجليزي/تقني) إلى رسالة عربية واضحة
 * يفهمها المستخدم العادي، مع تسجيل السبب التقني الأصلي بسجل الخادم فقط للتشخيص.
 */
function translateCheckUidError(rawMessage: string | null | undefined, httpStatus: number): string {
  const raw = String(rawMessage || "").toLowerCase();
  if (httpStatus === 404 || raw.includes("not found") || raw.includes("invalid") || raw.includes("no account") || raw.includes("does not exist") || raw.includes("user not found") || raw.includes("player") ) {
    return "لم يتم العثور على حساب بهذا المعرّف. يرجى التأكد من صحة المعرّف والمنطقة/السيرفر والمحاولة مرة أخرى.";
  }
  if (httpStatus === 429 || raw.includes("rate limit") || raw.includes("too many")) {
    return "عدد كبير من محاولات التحقق خلال وقت قصير. يرجى الانتظار قليلاً ثم إعادة المحاولة.";
  }
  if (httpStatus === 401 || raw.includes("unauthorized") || raw.includes("invalid key") || raw.includes("invalid api")) {
    return "تعذر إتمام التحقق حالياً بسبب مشكلة في إعدادات الخدمة. تم إبلاغ الإدارة، يرجى المحاولة لاحقاً.";
  }
  if (httpStatus === 402 || raw.includes("balance") || raw.includes("credit") || raw.includes("رصيد")) {
    return "تعذر إتمام التحقق حالياً بسبب نفاد رصيد الخدمة. تم إبلاغ الإدارة، يرجى المحاولة لاحقاً.";
  }
  if (httpStatus === 400 || raw.includes("missing") || raw.includes("required") || raw.includes("zone")) {
    return "يرجى التأكد من تعبئة المعرّف والمنطقة/السيرفر (إن وُجدت) بشكل صحيح.";
  }
  if (raw.includes("timeout") || raw.includes("timed out")) {
    return "استغرقت عملية التحقق وقتاً أطول من المتوقع. يرجى المحاولة مرة أخرى.";
  }
  if (httpStatus === 502 || httpStatus >= 500) {
    return "خدمة التحقق من الاسم غير متاحة مؤقتاً. يرجى المحاولة بعد قليل.";
  }
  return "لم يتم العثور على الحساب. يرجى التحقق من صحة المعرّف والمنطقة/السيرفر والمحاولة مرة أخرى.";
}

/**
 * يتحقق من معرّف اللاعب عبر مزود Check UID لأي لعبة/تطبيق مدعوم (بما فيها Free Fire عبر هذا المزود).
 * uidOrRegion: المعرف (UID) — extra: قيمة المنطقة/السيرفر إن وُجدت (اختيارية حسب اللعبة).
 */
export async function verifyVolseverName(slug: string, uid: string, extra: string | null, apiKey: string) {
  const game = VOLSEVER_GAME_MAP[slug];
  if (!game) {
    throw Object.assign(new Error("هذه اللعبة أو التطبيق غير مدعوم حالياً لميزة التحقق من الاسم."), { httpStatus: 400 });
  }
  const params = new URLSearchParams({ id: uid });
  if (game.hasZone) {
    if (!extra || !String(extra).trim()) {
      throw Object.assign(new Error("يرجى تحديد المنطقة أو رقم السيرفر أولاً."), { httpStatus: 400 });
    }
    params.set("zone", String(extra).trim());
  }
  const url = `${CHECKUID_BASE_URL}/games/${encodeURIComponent(slug)}/check?${params.toString()}`;
  let resp: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    resp = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` }, signal: controller.signal });
    clearTimeout(timeout);
  } catch (networkErr) {
    console.error("[NameVerification][CheckUID] network error:", networkErr, "| slug:", slug);
    throw Object.assign(new Error("تعذر الاتصال بخدمة التحقق. يرجى التأكد من اتصالك بالإنترنت والمحاولة لاحقاً."), { httpStatus: 502 });
  }
  const raw = await resp.text().catch(() => "");
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!resp.ok || !data || data.success !== true || !data.data) {
    const rawMsg = data?.message || `HTTP ${resp.status}`;
    console.error("[NameVerification][CheckUID] provider error:", rawMsg, "| slug:", slug, "| uid:", uid, "| zone:", extra);
    throw Object.assign(new Error(translateCheckUidError(String(rawMsg), resp.status)), { httpStatus: resp.status === 404 ? 400 : (resp.status || 400) });
  }
  const d = data.data || {};
  return {
    accountId: d.player_id ?? uid,
    nickname: d.nickname ?? null,
    region: d.zone ?? d.region ?? extra ?? null,
    level: null,
    clanName: null,
    game: game.label,
  };
}

/**
 * قائمة المناطق (Zones) عبر Check UID: لا يوفّر المزود نقطة جلب مناطق ديناميكية،
 * لذا تبقى الألعاب التي تتطلب Zone باستخدام إدخال يدوي (zoneType: "input") — الدالة محفوظة
 * للتوافق مع بقية النظام وتُعيد قائمة فارغة دائماً.
 */
export async function fetchVolseverZones(_slug: string, _apiKey: string) {
  return [] as { value: string; label: string }[];
}
