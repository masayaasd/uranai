(function () {
  "use strict";

  const CONFIG = {
    storageKey: "ryujin_diagnoses_v1",
    lineHarness: {
      enabled: true,
      endpoint: "/api/diagnosis-tags",
      liffId: "2010382261-EjL1dqOH",
      liffUrl: "https://liff.line.me/2010382261-EjL1dqOH",
      refCode: "ryujin_diagnosis",
      redirectPath: "/t/",
      userIdParams: ["line_user_id", "lh_uid", "lhUserId", "uid", "userId", "lu"],
      entryParams: ["entry", "lh_entry", "route", "utm_content"]
    }
  };

  let lineHarnessInitPromise = null;
  let lineHarnessIdentityPromise = null;

  const AXES = {
    money: { label: "金運不安度", type: "white" },
    family: { label: "家族責任度", type: "green" },
    healing: { label: "孤独・癒し欲求", type: "moon" },
    action: { label: "行動変化欲求", type: "gold" }
  };

  const TYPES = {
    white: {
      name: "白龍タイプ",
      theme: "生活を守る金運タイプ",
      title: "白龍守護型",
      image: "assets/type-white.png",
      essence: "あなたは、毎日の暮らしを丁寧に守りながら、お金の流れを安定させたい気持ちが強い方です。",
      concern: "支払い、老後資金、急な出費など、現実的な不安を一人で抱え込みやすい傾向があります。",
      point: "金運が乱れやすいのは、財布・通帳・請求書などを目にした時に心が重くなる瞬間です。",
      place: "まずは財布、家計メモ、玄関の足元を整えると、気持ちの整理が進みやすくなります。",
      action: "今日できる開運行動は、財布の中から不要なレシートを3枚だけ抜き、深呼吸してから戻すことです。",
      tags: ["白龍タイプ", "支払い不安", "老後資金不安"]
    },
    green: {
      name: "緑龍タイプ",
      theme: "家族を守る金運タイプ",
      title: "緑龍守護型",
      image: "assets/type-green.png",
      essence: "あなたは、自分のことよりも家族や大切な人を優先しながら、暮らしの土台を支えてきた方です。",
      concern: "子供、親、家計、住まいのことを考えすぎて、自分の安心が後回しになりやすいかもしれません。",
      point: "金運が乱れやすいのは、家族のために我慢を重ねて、必要な相談を先延ばしにする時です。",
      place: "住まいの中心、食卓、玄関まわりを整えることで、家族全体の空気が落ち着きやすくなります。",
      action: "今日できる開運行動は、家族のためではなく自分のために温かい飲み物を一杯用意することです。",
      tags: ["緑龍タイプ", "家族不安", "家族を守る"]
    },
    moon: {
      name: "月龍タイプ",
      theme: "癒しと受け取りの金運タイプ",
      title: "月龍安定型",
      image: "assets/type-moon.png",
      essence: "あなたは、目に見えない安心や優しい言葉を大切にしながら、自分の心を整えて進む方です。",
      concern: "夜の不安、孤独感、誰にもわかってもらえない感覚が、お金の不安と重なりやすい傾向があります。",
      point: "金運が乱れやすいのは、不安を抱えたまま眠りにつき、翌朝まで心を休ませられない時です。",
      place: "寝室、枕元、水回りを静かに整えると、受け取る力と安心感が戻りやすくなります。",
      action: "今日できる開運行動は、寝る前に心配事をひとつ紙に書き、明日の自分へ預けることです。",
      tags: ["月龍タイプ", "孤独不安", "癒し希望"]
    },
    gold: {
      name: "金龍タイプ",
      theme: "人生転機の金運タイプ",
      title: "金龍転機型",
      image: "assets/type-gold.png",
      essence: "あなたは、今の流れを変えたい気持ちを内側に持ち、具体的な一歩を求めている方です。",
      concern: "変わりたいのに何から始めればよいかわからず、答えを探して立ち止まりやすい時期かもしれません。",
      point: "金運が乱れやすいのは、焦りから情報を集めすぎて、自分に合う行動を選べなくなる時です。",
      place: "机、スマホのメモ、財布の定位置を整えると、今やるべきことが見えやすくなります。",
      action: "今日できる開運行動は、やめたい支出をひとつだけメモし、代わりに未来へ残したい使い道を書くことです。",
      tags: ["金龍タイプ", "収入アップ希望", "個別相談興味あり"]
    }
  };

  const SUB_LABELS = {
    white_green: "白龍守護型｜家族を守る生活金運タイプ",
    white_moon: "白龍癒守型｜不安をほどきながら金運を整えるタイプ",
    white_gold: "白龍転機型｜暮らしを整えて現実を変えるタイプ",
    green_white: "緑龍安定型｜家族と生活の安心を守るタイプ",
    green_moon: "緑龍癒守型｜家族を支えながら心も守るタイプ",
    green_gold: "緑龍転機型｜家族のために流れを変えるタイプ",
    moon_white: "月龍安定型｜心の安心から金運が整うタイプ",
    moon_green: "月龍守護型｜優しさで家族と自分を整えるタイプ",
    moon_gold: "月龍転機型｜癒しの先に新しい一歩が見えるタイプ",
    gold_white: "金龍安定型｜現実を整えながら転機をつかむタイプ",
    gold_green: "金龍守護型｜家族を守るために現実を変えるタイプ",
    gold_moon: "金龍癒守型｜不安を整えながら行動へ移るタイプ"
  };

  const PREFECTURES = [
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県", "茨城県", "栃木県", "群馬県",
    "埼玉県", "千葉県", "東京都", "神奈川県", "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
    "岐阜県", "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
    "鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県", "福岡県",
    "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
  ];

  const BASIC_FIELDS = [
    { id: "nickname", label: "ニックネーム", type: "text", required: true, placeholder: "例：さくら" },
    { id: "birthdate", label: "生年月日", type: "date", required: true },
    { id: "gender", label: "性別", required: true, options: ["女性", "男性", "回答しない"] },
    { id: "ageRange", label: "年代", required: true, options: ["30代以下", "40代", "50代", "60代", "70代以上"] },
    { id: "prefecture", label: "都道府県", required: true, options: PREFECTURES }
  ];

  const MARKETING_FIELDS = [
    { id: "occupation", label: "職業", options: ["会社員", "パート・アルバイト", "自営業", "専業主婦", "年金生活", "在宅ワーク", "その他", "答えたくない"] },
    { id: "incomeRange", label: "年収", options: ["200万円未満", "200万円〜400万円", "400万円〜600万円", "600万円〜800万円", "800万円〜1,000万円", "1,000万円〜1,500万円", "1,500万円以上", "答えたくない"] },
    { id: "familyStructure", label: "家族構成", options: ["一人暮らし", "夫婦で同居", "子供と同居", "親と同居", "子供は独立している", "その他", "答えたくない"] },
    { id: "mainConcern", label: "今一番気になる悩み", options: ["毎月の支払い", "老後資金", "貯金が増えない", "借金・ローン", "家族への支援", "急な出費", "収入を増やしたい", "孤独や不安", "特にない", "答えたくない"] },
    { id: "interestTheme", label: "LINEで受け取りたい情報", options: ["金運", "龍神", "神社", "家の運気", "財布", "玄関", "トイレ", "暦", "祈り・祝詞", "副業", "資産形成", "個別鑑定"] },
    { id: "buyingIntent", label: "自分専用の鑑定やアドバイスへの興味", options: ["すぐに受けてみたい", "内容によっては受けたい", "無料なら受けたい", "今は情報だけ見たい"] }
  ];

  const QUESTIONS = [
    q("q01", "毎月の支払いについて不安になることがある", "money"),
    q("q02", "老後のお金について考えると不安になる", "money"),
    q("q03", "急な出費があると気持ちが重くなる", "money"),
    q("q04", "もっとお金に余裕があれば安心できると思う", "money"),
    q("q05", "貯金が思うように増えないと感じている", "money"),
    q("q06", "財布や通帳を見ると不安になることがある", "money"),
    q("q07", "自分より家族のことを優先しがち", "family"),
    q("q08", "子供や親に迷惑をかけたくない気持ちが強い", "family"),
    q("q09", "家族の将来を考えて不安になることがある", "family"),
    q("q10", "自分だけ楽になることに少し罪悪感がある", "family"),
    q("q11", "家計を守る責任を感じている", "family"),
    q("q12", "家族のためなら自分のことを後回しにしてしまう", "family"),
    q("q13", "夜になると不安が強くなることがある", "healing"),
    q("q14", "誰かに「大丈夫」と言ってほしい時がある", "healing"),
    q("q15", "自分の気持ちをわかってくれる人が少ないと感じる", "healing"),
    q("q16", "占いやスピリチュアル動画を見ると落ち着く", "healing"),
    q("q17", "「守られている」と感じられる言葉に安心する", "healing"),
    q("q18", "コメント欄で同じような人を見ると安心する", "healing"),
    q("q19", "今の流れを変えたいと思っている", "action"),
    q("q20", "何か新しいきっかけがほしい", "action"),
    q("q21", "自分に合う金運改善法を知りたい", "action"),
    q("q22", "今の悩みに対して具体的な答えがほしい", "action"),
    q("q23", "個別に見てもらえるなら相談してみたい", "action"),
    q("q24", "今のままではいけないと感じることがある", "action"),
    q("q25", "玄関の状態が気になる", "money"),
    q("q26", "トイレや水回りを整えると運気が変わる気がする", "healing"),
    q("q27", "財布やお金の置き場所にこだわりがある", "money"),
    q("q28", "寝る前に不安なことを考えてしまう", "healing"),
    q("q29", "神社やお守りに安心感を感じる", "family"),
    q("q30", "最近、何かのサインを受け取っている気がする", "action")
  ];

  const ANSWERS = [
    { label: "とても当てはまる", value: 3 },
    { label: "少し当てはまる", value: 2 },
    { label: "あまり当てはまらない", value: 1 },
    { label: "当てはまらない", value: 0 }
  ];

  const MAX_ANSWER_VALUE = Math.max(...ANSWERS.map(answer => answer.value));
  const SCORE_AXIS_ORDER = ["money", "family", "healing", "action"];
  const AXIS_MAX_SCORES = QUESTIONS.reduce((scores, question) => {
    scores[question.axis] += MAX_ANSWER_VALUE;
    return scores;
  }, { money: 0, family: 0, healing: 0, action: 0 });

  const state = {
    step: "home",
    consent: false,
    basics: {},
    marketing: {},
    freeNote: "",
    currentQuestion: 0,
    answers: {},
    result: null,
    error: ""
  };

  const app = document.getElementById("app");
  const modal = document.getElementById("legalModal");
  const legalTitle = document.getElementById("legalTitle");
  const legalBody = document.getElementById("legalBody");

  document.addEventListener("click", handleClick);
  window.addEventListener("hashchange", handleHash);
  handleHash();
  startAuraCanvas();

  function q(id, text, axis) {
    return { id, text, axis };
  }

  function handleHash() {
    const route = location.hash.replace("#", "") || "home";
    if (route === "result" && state.result) {
      state.step = "result";
      render();
      return;
    }
    if (route === "home" || route === "admin") {
      resetFlow();
    }
    render();
  }

  function handleClick(event) {
    const routeButton = event.target.closest("[data-route]");
    if (routeButton) {
      const route = routeButton.dataset.route;
      location.hash = route;
      return;
    }

    const action = event.target.closest("[data-action]");
    if (action) {
      runAction(action.dataset.action, action);
      return;
    }

    const legalButton = event.target.closest("[data-legal]");
    if (legalButton) {
      openLegal(legalButton.dataset.legal);
      return;
    }

    if (event.target.closest("[data-close-modal]") || event.target === modal) {
      closeLegal();
    }
  }

  function runAction(action, element) {
    state.error = "";
    if (action === "start") {
      prepareLineHarnessSession()
        .then((redirecting) => {
          if (redirecting) return;
          const shell = document.querySelector(".app-shell");
          shell?.classList.add("is-awakening");
          window.setTimeout(() => {
            shell?.classList.remove("is-awakening");
            state.step = "consent";
            render();
          }, 760);
        })
        .catch(() => {
          state.step = "consent";
          render();
        });
      return;
    }
    if (action === "consent") {
      const checked = document.getElementById("consentCheck")?.checked;
      if (!checked) {
        state.error = "同意チェックを入れると診断を開始できます。";
      } else {
        state.consent = true;
        state.step = "basics";
      }
    }
    if (action === "saveBasics") {
      const data = collectFields(BASIC_FIELDS);
      state.basics = { ...state.basics, ...data.values };
      if (data.error) {
        state.error = data.error;
      } else {
        state.step = "marketing";
      }
    }
    if (action === "saveMarketing") {
      const data = collectFields(MARKETING_FIELDS);
      state.marketing = { ...state.marketing, ...data.values };
      if (data.error) {
        state.error = data.error;
      } else {
        state.step = "quiz";
      }
    }
    if (action === "answer") {
      const question = QUESTIONS[state.currentQuestion];
      state.answers[question.id] = {
        question: question.text,
        axis: question.axis,
        value: Number(element.dataset.value),
        label: element.dataset.label
      };
      if (state.currentQuestion < QUESTIONS.length - 1) {
        state.currentQuestion += 1;
      } else {
        state.step = "freeNote";
        render();
        return;
      }
    }
    if (action === "saveFreeNote") {
      state.freeNote = document.getElementById("freeNote")?.value.trim() || "";
      startAnalysis();
      return;
    }
    if (action === "skipFreeNote") {
      state.freeNote = "";
      startAnalysis();
      return;
    }
    if (action === "backFreeNote") {
      state.step = "quiz";
      state.currentQuestion = QUESTIONS.length - 1;
    }
    if (action === "backQuestion") {
      if (state.currentQuestion > 0) {
        state.currentQuestion -= 1;
      } else {
        state.step = "marketing";
      }
    }
    if (action === "downloadCsv") {
      downloadCsv();
      return;
    }
    if (action === "clearAdmin") {
      if (confirm("保存済みの診断データをこのブラウザから削除しますか？")) {
        localStorage.removeItem(CONFIG.storageKey);
      }
    }
    render();
  }

  function resetFlow() {
    state.step = "home";
    state.consent = false;
    state.basics = {};
    state.marketing = {};
    state.freeNote = "";
    state.currentQuestion = 0;
    state.answers = {};
    state.result = null;
    state.error = "";
  }

  function render() {
    const screens = {
      home: renderHome,
      consent: renderConsent,
      basics: renderBasics,
      marketing: renderMarketing,
      quiz: renderQuiz,
      freeNote: renderFreeNote,
      loading: renderLoading,
      result: renderResult
    };
    app.innerHTML = (screens[state.step] || renderHome)();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderHome() {
    return `
      <section class="hero">
        <div class="hero-media" aria-hidden="true"></div>
        <div class="hero-body">
          <span class="eyebrow">無料診断 約3分</span>
          <h1>あなたの金運が動き出す時期を無料診断</h1>
          <p class="lead">生年月日と30の質問から、あなたを守る龍神タイプ・今のお金の流れ・整えるべき開運行動を鑑定します。</p>
          <div class="hero-switch-wrap">
            <button class="hero-switch" type="button" data-action="start" aria-label="無料診断をはじめる">
              <span class="hero-switch-orbit" aria-hidden="true"></span>
              <span class="hero-switch-core">
                <span class="hero-switch-kicker">TOUCH</span>
                <span class="hero-switch-main">診断開始</span>
              </span>
            </button>
          </div>
          <ul class="trust-list" aria-label="診断の特徴">
            <li>LINEで専用鑑定書を受け取れます</li>
            <li>金銭的成果を保証するものではありません</li>
          </ul>
        </div>
      </section>
    `;
  }

  function renderConsent() {
    return `
      <section class="screen">
        <div class="panel">
          <span class="eyebrow">診断前のご確認</span>
          <h2>安心して鑑定を受けていただくために</h2>
          <ul class="consent-list">
            <li>診断結果作成のために回答内容を利用します。</li>
            <li>LINE登録後、診断結果や関連する開運情報を配信する場合があります。</li>
            <li>入力内容はマーケティング分析やサービス改善に利用します。</li>
            <li>診断は娯楽・参考情報であり、将来の結果を保証するものではありません。</li>
            <li>個人を不当に不安にさせる目的では利用しません。</li>
          </ul>
          <label class="check-row">
            <input id="consentCheck" type="checkbox">
            <span>上記に同意して診断をはじめる</span>
          </label>
          ${errorHtml()}
          <div class="action-row">
            <button class="primary-button" type="button" data-action="consent">診断をはじめる</button>
            <button class="secondary-button" type="button" data-route="home">戻る</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderBasics() {
    return `
      <section class="screen">
        <div class="panel">
          <span class="eyebrow">基本情報</span>
          <h2>鑑定の精度を高めるために</h2>
          <p class="lead">入力は診断結果の作成とLINEでの鑑定書配布に利用します。</p>
          <div class="form-grid">
            ${BASIC_FIELDS.map(fieldHtml).join("")}
          </div>
          ${errorHtml()}
          <div class="action-row">
            <button class="primary-button" type="button" data-action="saveBasics">次へ進む</button>
            <button class="secondary-button" type="button" data-route="home">最初に戻る</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderMarketing() {
    return `
      <section class="screen">
        <div class="panel">
          <span class="eyebrow">今の状況</span>
          <h2>あなたに合う鑑定文へ整えます</h2>
          <p class="lead">答えにくい項目は「答えたくない」を選んでください。</p>
          <div class="form-grid">
            ${MARKETING_FIELDS.map(fieldHtml).join("")}
          </div>
          ${errorHtml()}
          <div class="action-row">
            <button class="primary-button" type="button" data-action="saveMarketing">質問診断へ進む</button>
            <button class="secondary-button" type="button" data-route="home">最初に戻る</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderQuiz() {
    const question = QUESTIONS[state.currentQuestion];
    const progress = Math.round(((state.currentQuestion + 1) / QUESTIONS.length) * 100);
    const selected = state.answers[question.id]?.value;
    return `
      <section class="screen">
        <div class="progress-area" aria-label="診断進捗">
          <div class="progress-meta">
            <span>${state.currentQuestion + 1} / ${QUESTIONS.length}</span>
            <span>龍神が金運傾向を読み解いています</span>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
        </div>
        <div class="panel question-card">
          <div>
            <div class="question-number">${AXES[question.axis].label}</div>
            <h2>${escapeHtml(question.text)}</h2>
          </div>
          <div class="answer-list">
            ${ANSWERS.map(answer => `
              <button
                class="answer-button ${selected === answer.value ? "is-selected" : ""}"
                type="button"
                data-action="answer"
                data-value="${answer.value}"
                data-label="${answer.label}">
                ${answer.label}
              </button>
            `).join("")}
          </div>
        </div>
        <button class="back-button" type="button" data-action="backQuestion">← 戻る</button>
      </section>
    `;
  }

  function renderFreeNote() {
    return `
      <section class="screen">
        <div class="progress-area" aria-label="診断進捗">
          <div class="progress-meta">
            <span>${QUESTIONS.length} / ${QUESTIONS.length}</span>
            <span>最後に、今の気持ちを整えます</span>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width:100%"></div></div>
        </div>
        <div class="panel">
          <span class="eyebrow">任意入力</span>
          <h2>最後に、今の悩みや聞いてほしいことがあれば書いてください</h2>
          <p class="lead">書かなくても診断できます。入力した内容は、今後の個別鑑定導線で確認できるように保存します。</p>
          <div class="form-grid">
            <div class="field">
              <label for="freeNote">自由記入欄</label>
              <textarea id="freeNote" maxlength="600" placeholder="例：毎月の支払いが不安です。家族にはあまり相談できず、これからどう整えたらいいか知りたいです。">${escapeHtml(state.freeNote)}</textarea>
              <small>600文字まで。未入力でも進めます。</small>
            </div>
          </div>
          <div class="action-row">
            <button class="primary-button" type="button" data-action="saveFreeNote">鑑定結果を見る</button>
            <button class="secondary-button" type="button" data-action="skipFreeNote">書かずに結果を見る</button>
          </div>
        </div>
        <button class="back-button" type="button" data-action="backFreeNote">← ひとつ前の質問へ戻る</button>
      </section>
    `;
  }

  function renderLoading() {
    return `
      <section class="screen loader">
        <div>
          <div class="reading-sigil" aria-hidden="true"></div>
          <h2>専用鑑定書を作成中</h2>
          <div class="status-lines" id="analysisLines">
            <p>生年月日から運気を照合中</p>
          </div>
        </div>
      </section>
    `;
  }

  function renderResult() {
    if (!state.result) {
      return renderHome();
    }
    const result = state.result;
    const main = TYPES[result.mainType];
    return `
      <section class="screen">
        <div class="result-hero" style="background-image: linear-gradient(180deg, rgba(12, 16, 24, 0.02), rgba(12, 16, 24, 0.2) 38%, rgba(12, 16, 24, 0.96) 88%), linear-gradient(110deg, rgba(45, 25, 50, 0.42), transparent 55%), url('${main.image}')">
          <div>
            <span class="result-badge">診断完了</span>
            <h1 class="type-title">${main.name}</h1>
            <p class="lead">${result.subLabel}</p>
          </div>
        </div>

        <div class="panel">
          <h2>${main.theme}</h2>
          <p>${personalGreeting(result)}</p>
          ${scoreRadarHtml(result.scores)}
        </div>

        ${resultSection("あなたの本質", main.essence)}
        ${resultSection("今抱えている可能性が高い悩み", buildConcern(result))}
        ${resultSection("金運が乱れやすいポイント", main.point)}
        ${resultSection("今整えるべき場所", main.place)}
        ${resultSection("今日からできる開運行動", main.action)}

        <div class="panel result-section">
          <h3>4つの龍神タイプ</h3>
          <p class="lead">あなたの結果だけでなく、診断で判定される龍神タイプの雰囲気も確認できます。</p>
          <div class="type-gallery">
            ${Object.entries(TYPES).map(([key, type]) => `
              <figure class="type-card ${key === result.mainType ? "is-current" : ""}">
                <img src="${type.image}" alt="${type.name}のイメージ">
                <figcaption>
                  <strong>${type.name}</strong>
                  <span>${type.theme}</span>
                </figcaption>
              </figure>
            `).join("")}
          </div>
        </div>

      </section>
    `;
  }

  function resultSection(title, body) {
    return `
      <div class="panel result-section">
        <h3>${title}</h3>
        <p>${body}</p>
      </div>
    `;
  }

  function scoreRadarHtml(scores) {
    const center = 130;
    const radius = 76;
    const labelPositions = {
      money: { x: 130, y: 18, anchor: "middle" },
      family: { x: 244, y: 130, anchor: "end" },
      healing: { x: 130, y: 244, anchor: "middle" },
      action: { x: 16, y: 130, anchor: "start" }
    };
    const axisCount = SCORE_AXIS_ORDER.length;
    const pointFor = (index, ratio, baseRadius = radius) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / axisCount;
      const x = center + Math.cos(angle) * baseRadius * ratio;
      const y = center + Math.sin(angle) * baseRadius * ratio;
      return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
    };
    const pointsToString = points => points.map(point => `${point.x},${point.y}`).join(" ");
    const gridLevels = [0.25, 0.5, 0.75, 1];
    const dataPoints = SCORE_AXIS_ORDER.map((axis, index) => {
      const max = AXIS_MAX_SCORES[axis] || 1;
      return pointFor(index, Math.max(0, Math.min(1, scores[axis] / max)));
    });
    return `
      <div class="radar-card" aria-label="診断スコア">
        <div class="radar-chart-wrap">
          <svg class="radar-chart" viewBox="0 0 260 260" role="img" aria-labelledby="radarTitle radarDesc">
            <title id="radarTitle">診断スコアのレーダーチャート</title>
            <desc id="radarDesc">金運不安度、家族責任度、孤独・癒し欲求、行動変化欲求の4軸を比較しています。</desc>
            <defs>
              <radialGradient id="radarGlow" cx="50%" cy="50%" r="62%">
                <stop offset="0%" stop-color="#e8fbff" stop-opacity="0.82"></stop>
                <stop offset="58%" stop-color="#7ef0d5" stop-opacity="0.34"></stop>
                <stop offset="100%" stop-color="#cbb7ff" stop-opacity="0"></stop>
              </radialGradient>
              <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#e8fbff" stop-opacity="0.68"></stop>
                <stop offset="48%" stop-color="#7ef0d5" stop-opacity="0.54"></stop>
                <stop offset="100%" stop-color="#cbb7ff" stop-opacity="0.58"></stop>
              </linearGradient>
            </defs>
            <circle cx="${center}" cy="${center}" r="92" fill="url(#radarGlow)"></circle>
            ${gridLevels.map(level => `<polygon class="radar-grid-line" points="${pointsToString(SCORE_AXIS_ORDER.map((_, index) => pointFor(index, level)))}"></polygon>`).join("")}
            ${SCORE_AXIS_ORDER.map((_, index) => {
              const edge = pointFor(index, 1);
              return `<line class="radar-axis-line" x1="${center}" y1="${center}" x2="${edge.x}" y2="${edge.y}"></line>`;
            }).join("")}
            <polygon class="radar-area" points="${pointsToString(dataPoints)}"></polygon>
            <polyline class="radar-outline" points="${pointsToString(dataPoints)} ${dataPoints[0].x},${dataPoints[0].y}"></polyline>
            ${SCORE_AXIS_ORDER.map((axis, index) => {
              const dot = dataPoints[index];
              const label = labelPositions[axis];
              return `
                <circle class="radar-dot radar-dot-${AXES[axis].type}" cx="${dot.x}" cy="${dot.y}" r="4.5"></circle>
                <text class="radar-label" x="${label.x}" y="${label.y}" text-anchor="${label.anchor}" dominant-baseline="middle">${AXES[axis].label}</text>
              `;
            }).join("")}
          </svg>
        </div>
        <div class="radar-stats">
          ${SCORE_AXIS_ORDER.map(axis => {
            const score = scores[axis];
            const max = AXIS_MAX_SCORES[axis] || 1;
            const percent = Math.round((score / max) * 100);
            return `
              <div class="radar-stat radar-stat-${AXES[axis].type}">
                <span>${AXES[axis].label}</span>
                <strong>${score}<small>/${max}</small></strong>
                <em>${percent}%</em>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function fieldHtml(field) {
    const saved = state.basics[field.id] || state.marketing[field.id] || "";
    if (field.options) {
      return `
        <div class="field">
          <label for="${field.id}">${field.label}${field.required ? " *" : ""}</label>
          <select id="${field.id}" ${field.required ? "required" : ""}>
            <option value="">選択してください</option>
            ${field.options.map(option => `<option value="${escapeAttr(option)}" ${saved === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
          </select>
        </div>
      `;
    }
    return `
      <div class="field">
        <label for="${field.id}">${field.label}${field.required ? " *" : ""}</label>
        <input id="${field.id}" type="${field.type || "text"}" value="${escapeAttr(saved)}" placeholder="${escapeAttr(field.placeholder || "")}" ${field.required ? "required" : ""}>
      </div>
    `;
  }

  function collectFields(fields) {
    const values = {};
    let missing = "";
    for (const field of fields) {
      const element = document.getElementById(field.id);
      values[field.id] = element ? element.value.trim() : "";
      if (!missing && field.required && !values[field.id]) {
        missing = field.label;
      }
    }
    return { values, error: missing ? `${missing}を入力してください。` : "" };
  }

  function startAnalysis() {
    state.step = "loading";
    render();
    const lines = [
      "生年月日から運気を照合中",
      "金運の流れを解析中",
      "あなたを守る龍神タイプを判定中",
      "今の悩みと開運行動を整理中",
      "専用鑑定書を作成中"
    ];
    let index = 0;
    const node = document.getElementById("analysisLines");
    const timer = setInterval(() => {
      index += 1;
      if (node && lines[index]) {
        node.innerHTML = `<p>${lines[index]}</p>`;
      }
      if (index >= lines.length) {
        clearInterval(timer);
        state.result = buildResult();
        saveRecord(state.result);
        sendLineHarnessTags(state.result, "diagnosis_completed");
        state.step = "result";
        location.hash = "result";
        render();
      }
    }, 950);
  }

  function buildResult() {
    const scores = { money: 0, family: 0, healing: 0, action: 0 };
    Object.values(state.answers).forEach(answer => {
      scores[answer.axis] += answer.value;
    });
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const mainType = AXES[ranked[0][0]].type;
    const subType = AXES[ranked[1][0]].type;
    const result = {
      diagnosisId: `diag_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      mainAxis: ranked[0][0],
      subAxis: ranked[1][0],
      mainType,
      subType,
      mainTypeName: TYPES[mainType].name,
      subLabel: SUB_LABELS[`${mainType}_${subType}`] || `${TYPES[mainType].title}｜${TYPES[mainType].theme}`,
      scores,
      tags: buildTags(mainType),
      basics: { ...state.basics },
      marketing: { ...state.marketing },
      answers: { ...state.answers },
      freeNote: state.freeNote,
      lineContext: getLineContext(),
      source: getSource()
    };
    return result;
  }

  function buildTags(mainType) {
    const tags = new Set(["診断_完了", ...TYPES[mainType].tags]);
    const data = { ...state.basics, ...state.marketing };
    ["ageRange", "prefecture", "occupation", "familyStructure"].forEach(key => {
      if (data[key] && data[key] !== "答えたくない") tags.add(data[key]);
    });
    if (data.mainConcern && data.mainConcern !== "答えたくない") tags.add(data.mainConcern);
    if (data.buyingIntent === "すぐに受けてみたい") tags.add("すぐ相談したい");
    if (data.buyingIntent === "内容によっては受けたい") tags.add("内容次第で相談したい");
    if (data.buyingIntent === "無料なら受けたい") tags.add("無料なら見たい");
    if (data.buyingIntent === "今は情報だけ見たい") tags.add("情報収集のみ");
    return Array.from(tags);
  }

  function buildConcern(result) {
    const main = TYPES[result.mainType];
    const concern = result.marketing.mainConcern;
    const family = result.marketing.familyStructure;
    const prefix = concern && concern !== "答えたくない" && concern !== "特にない"
      ? `特に「${escapeHtml(concern)}」が心に残りやすい時期です。`
      : "";
    const familyText = family && family !== "答えたくない"
      ? ` ${escapeHtml(family)}という暮らしの中で、無理に強くいようとしてきた場面もあるかもしれません。`
      : "";
    return `${prefix}${familyText} ${main.concern} ただし、これは悪い暗示ではありません。今の状態を言葉にして、少しずつ整えるための合図です。`;
  }

  function personalGreeting(result) {
    const name = result.basics.nickname || "あなた";
    return `${escapeHtml(name)}さんは「${escapeHtml(result.subLabel)}」です。あなたは間違っていません。今は焦って変えるより、整えることで流れが戻りやすい時期です。`;
  }

  function getSource() {
    const params = new URLSearchParams(location.search);
    return {
      source: params.get("source") || document.referrer || "direct",
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
      youtube_video_id: params.get("v") || params.get("youtube_video_id") || ""
    };
  }

  function getLineContext() {
    const params = new URLSearchParams(location.search);
    const userId = firstParam(params, CONFIG.lineHarness.userIdParams);
    const entry = firstParam(params, CONFIG.lineHarness.entryParams) || inferLineEntry(params);
    return {
      userId,
      entry,
      sourceUrl: location.href,
      deliveredBy: entry || ""
    };
  }

  function firstParam(params, names) {
    for (const name of names) {
      const value = params.get(name);
      if (value) return value;
    }
    return "";
  }

  function inferLineEntry(params) {
    if (params.get("utm_source") === "line") return params.get("utm_medium") || "line_url";
    return "";
  }

  async function prepareLineHarnessSession() {
    const lineContext = getLineContext();
    if (lineContext.userId) {
      return false;
    }

    if (!CONFIG.lineHarness.enabled || !CONFIG.lineHarness.liffId) {
      return false;
    }

    if (!window.liff) {
      redirectToLineHarnessLiff();
      return true;
    }

    try {
      await initLineHarnessLiff();
    } catch {
      redirectToLineHarnessLiff();
      return true;
    }

    if (!window.liff.isLoggedIn()) {
      redirectToLineHarnessLiff();
      return true;
    }
    return false;
  }

  function initLineHarnessLiff() {
    if (!lineHarnessInitPromise) {
      lineHarnessInitPromise = window.liff.init({ liffId: CONFIG.lineHarness.liffId });
    }
    return lineHarnessInitPromise;
  }

  function currentPageUrl() {
    const url = new URL(location.href);
    url.hash = "";
    return url.toString();
  }

  function lineHarnessReturnUrl() {
    const url = new URL(location.href);
    url.pathname = CONFIG.lineHarness.redirectPath || "/";
    url.hash = "";
    if (!url.searchParams.get("utm_source")) url.searchParams.set("utm_source", "line");
    if (!url.searchParams.get("entry")) url.searchParams.set("entry", "rich_menu");
    return url.toString();
  }

  function buildLineHarnessLiffUrl() {
    const url = new URL(CONFIG.lineHarness.liffUrl || `https://liff.line.me/${CONFIG.lineHarness.liffId}`);
    url.searchParams.set("liffId", CONFIG.lineHarness.liffId);
    if (CONFIG.lineHarness.refCode) url.searchParams.set("ref", CONFIG.lineHarness.refCode);
    url.searchParams.set("redirect", lineHarnessReturnUrl());
    return url.toString();
  }

  function redirectToLineHarnessLiff() {
    window.location.href = buildLineHarnessLiffUrl();
  }

  async function sendLineHarnessTags(result, eventName) {
    const statusBase = { eventName, occurredAt: new Date().toISOString() };
    if (!CONFIG.lineHarness.enabled || !CONFIG.lineHarness.endpoint) {
      updateLineHarnessStatus(result.diagnosisId, { ...statusBase, status: "disabled", error: "" });
      return;
    }

    let identity;
    try {
      identity = await getLineHarnessIdentity();
    } catch (error) {
      updateLineHarnessStatus(result.diagnosisId, { ...statusBase, status: "skipped", error: error.message });
      return;
    }

    if (!identity.idToken && !identity.lineUserId) {
      updateLineHarnessStatus(result.diagnosisId, {
        ...statusBase,
        status: "skipped",
        error: identity.error || "missing_line_identity",
        lineUserId: identity.lineUserId || ""
      });
      return;
    }

    const payload = buildLineHarnessPayload(result, eventName, identity);

    try {
      const response = await fetch(CONFIG.lineHarness.endpoint, {
        method: "POST",
        headers: lineHarnessHeaders(),
        body: JSON.stringify(payload),
        keepalive: true
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || `HTTP ${response.status}`);
      }
      const responseData = await response.json().catch(() => null);
      updateLineHarnessStatus(result.diagnosisId, {
        ...statusBase,
        status: "sent",
        error: "",
        lineUserId: responseData?.data?.lineUserId || identity.lineUserId || ""
      });
    } catch (error) {
      updateLineHarnessStatus(result.diagnosisId, {
        ...statusBase,
        status: "failed",
        error: error.message,
        lineUserId: identity.lineUserId || ""
      });
      console.warn("Lハーネス tag sync failed", error);
    }
  }

  async function getLineHarnessIdentity() {
    const lineContext = getLineContext();
    if (!CONFIG.lineHarness.liffId) {
      return { idToken: "", lineUserId: lineContext.userId, error: "missing_liff_id" };
    }
    if (lineContext.userId) {
      return { idToken: "", lineUserId: lineContext.userId, error: "" };
    }
    if (!window.liff) {
      return { idToken: "", lineUserId: lineContext.userId, error: "liff_sdk_not_loaded" };
    }
    if (!lineHarnessIdentityPromise) {
      lineHarnessIdentityPromise = (async () => {
        await initLineHarnessLiff();
        if (!window.liff.isLoggedIn()) {
          return { idToken: "", lineUserId: lineContext.userId, error: "liff_not_logged_in" };
        }
        const profile = await window.liff.getProfile();
        return {
          idToken: window.liff.getIDToken() || "",
          lineUserId: profile.userId || lineContext.userId,
          error: ""
        };
      })();
    }
    return lineHarnessIdentityPromise;
  }

  function lineHarnessHeaders() {
    return { "Content-Type": "application/json" };
  }

  function buildLineHarnessPayload(result, eventName, identity = {}) {
    const lineContext = result.lineContext || getLineContext();
    return {
      idToken: identity.idToken || "",
      event: eventName,
      occurredAt: new Date().toISOString(),
      lineUserIdHint: identity.lineUserId || lineContext.userId,
      entry: lineContext.entry,
      delivery: lineContext.deliveredBy,
      diagnosisId: result.diagnosisId,
      tags: lineHarnessTagsForEvent(result, eventName),
      result: {
        mainType: result.mainType,
        mainTypeName: result.mainTypeName,
        subType: result.subType,
        subLabel: result.subLabel,
        scores: result.scores
      },
      profile: {
        nickname: result.basics.nickname || "",
        birthdate: result.basics.birthdate || "",
        gender: result.basics.gender || "",
        ageRange: result.basics.ageRange || "",
        prefecture: result.basics.prefecture || "",
        occupation: result.marketing.occupation || "",
        incomeRange: result.marketing.incomeRange || "",
        familyStructure: result.marketing.familyStructure || "",
        mainConcern: result.marketing.mainConcern || "",
        interestTheme: result.marketing.interestTheme || "",
        buyingIntent: result.marketing.buyingIntent || "",
        freeNote: result.freeNote || ""
      },
      source: result.source,
      page: {
        href: lineContext.sourceUrl,
        referrer: document.referrer || ""
      }
    };
  }

  function lineHarnessTagsForEvent(result, eventName) {
    const tags = new Set(result.tags);
    if (eventName === "line_cta_clicked") {
      tags.add("ミニ鑑定_希望");
    }
    return Array.from(tags);
  }

  function updateLineHarnessStatus(diagnosisId, status) {
    const records = getRecords();
    const record = records.find(item => item.diagnosisId === diagnosisId);
    if (!record) return;
    record.lineHarnessStatus = status.status;
    record.lineHarnessLastEvent = status.eventName;
    record.lineHarnessSyncedAt = status.status === "sent" ? status.occurredAt : record.lineHarnessSyncedAt || "";
    record.lineHarnessLastTriedAt = status.occurredAt;
    record.lineHarnessError = status.error || "";
    if (status.lineUserId) record.lineUserId = status.lineUserId;
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(records));
  }

  function saveRecord(result) {
    const records = getRecords();
    records.unshift(flattenRecord(result));
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(records.slice(0, 500)));
  }

  function flattenRecord(result) {
    return {
      diagnosisId: result.diagnosisId,
      createdAt: result.createdAt,
      nickname: result.basics.nickname || "",
      birthdate: result.basics.birthdate || "",
      gender: result.basics.gender || "",
      ageRange: result.basics.ageRange || "",
      prefecture: result.basics.prefecture || "",
      occupation: result.marketing.occupation || "",
      incomeRange: result.marketing.incomeRange || "",
      familyStructure: result.marketing.familyStructure || "",
      mainConcern: result.marketing.mainConcern || "",
      interestTheme: result.marketing.interestTheme || "",
      buyingIntent: result.marketing.buyingIntent || "",
      freeNote: result.freeNote || "",
      lineUserId: result.lineContext?.userId || "",
      lineEntry: result.lineContext?.entry || "",
      lineHarnessStatus: "pending",
      lineHarnessLastEvent: "",
      lineHarnessSyncedAt: "",
      lineHarnessLastTriedAt: "",
      lineHarnessError: "",
      mainType: result.mainType,
      mainTypeName: result.mainTypeName,
      subType: result.subType,
      subLabel: result.subLabel,
      moneyScore: result.scores.money,
      familyScore: result.scores.family,
      healingScore: result.scores.healing,
      actionScore: result.scores.action,
      tags: result.tags,
      source: result.source.source,
      utm_source: result.source.utm_source,
      utm_medium: result.source.utm_medium,
      utm_campaign: result.source.utm_campaign,
      youtube_video_id: result.source.youtube_video_id,
      lineClickedAt: ""
    };
  }

  function markLineClicked() {
    if (!state.result) return;
    const records = getRecords();
    const record = records.find(item => item.diagnosisId === state.result.diagnosisId);
    if (record) {
      record.lineClickedAt = new Date().toISOString();
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(records));
    }
  }

  function getRecords() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.storageKey) || "[]");
    } catch (error) {
      return [];
    }
  }

  function downloadCsv() {
    const records = getRecords();
    const columns = [
      "diagnosisId", "createdAt", "nickname", "birthdate", "gender", "ageRange", "prefecture", "occupation",
      "incomeRange", "familyStructure", "mainConcern", "interestTheme", "buyingIntent", "mainTypeName", "subLabel",
      "freeNote", "moneyScore", "familyScore", "healingScore", "actionScore", "tags", "lineClickedAt", "lineUserId",
      "lineEntry", "lineHarnessStatus", "lineHarnessLastEvent", "lineHarnessSyncedAt", "lineHarnessLastTriedAt",
      "lineHarnessError", "source", "utm_source",
      "utm_medium", "utm_campaign", "youtube_video_id"
    ];
    const rows = [columns.join(",")].concat(records.map(record => columns.map(column => csvCell(Array.isArray(record[column]) ? record[column].join("|") : record[column])).join(",")));
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ryujin-diagnoses-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  function countBy(records, key) {
    return records.reduce((map, record) => {
      const label = record[key] || "未分類";
      map[label] = (map[label] || 0) + 1;
      return map;
    }, {});
  }

  function topLabel(counts) {
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : "なし";
  }

  function lineHarnessStatusHtml(record) {
    const status = record.lineHarnessStatus || "未連携";
    const entry = record.lineEntry || "entryなし";
    const userId = record.lineUserId || "userIdなし";
    const error = record.lineHarnessError ? `<br><small>${escapeHtml(record.lineHarnessError)}</small>` : "";
    return `<strong>${escapeHtml(status)}</strong><br><small>${escapeHtml(entry)}</small><br><small>${escapeHtml(userId)}</small>${error}`;
  }

  function formatDate(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function errorHtml() {
    return state.error ? `<p class="error">${escapeHtml(state.error)}</p>` : "";
  }

  function openLegal(type) {
    const docs = {
      privacy: {
        title: "プライバシーポリシー",
        body: [
          "当サイトは、診断結果の作成、LINEでの鑑定書配布、サービス改善、マーケティング分析のために、入力された情報を利用します。",
          "取得する情報は、ニックネーム、生年月日、年代、都道府県、職業、年収、家族構成、悩み、興味テーマ、診断回答、流入元情報です。",
          "LINE連携時は、LINE userId、表示名、プロフィール画像URL、配信許可ステータスを取得し、診断データと紐づける場合があります。",
          "健康状態、病歴、宗教、政治思想などのセンシティブ情報は原則として取得しません。配信の停止は案内された方法で行えます。"
        ]
      },
      terms: {
        title: "利用規約",
        body: [
          "本診断は娯楽・参考情報として提供されるもので、将来の金銭的成果、収入増加、投資成果、健康改善などを保証するものではありません。",
          "診断結果は、医療・法律・金融の専門助言ではありません。重要な判断は専門家へ相談してください。",
          "当サイトは、利用者を不当に不安にさせる目的で診断結果を表示しません。表現は改善される可能性があります。"
        ]
      },
      commerce: {
        title: "特定商取引法に基づく表記",
        body: [
          "販売事業者名、所在地、連絡先、販売価格、支払方法、返品・キャンセル条件は、本番公開時に事業者情報へ差し替えてください。",
          "無料診断の利用に費用はかかりません。LINE登録後に有料サービスを案内する場合は、各商品ページで価格と条件を明示します。",
          "不安を過度に煽る販売、金銭的成果の保証、購入しないことによる不利益の断定は行いません。"
        ]
      }
    };
    const doc = docs[type];
    legalTitle.textContent = doc.title;
    legalBody.innerHTML = doc.body.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeLegal() {
    modal.setAttribute("aria-hidden", "true");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function startAuraCanvas() {
    const canvas = document.getElementById("auraCanvas");
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const strokes = Array.from({ length: 26 }, (_, index) => ({
      seed: index * 97,
      x: Math.random(),
      y: Math.random(),
      speed: 0.00045 + Math.random() * 0.00055,
      length: 34 + Math.random() * 78,
      hue: index % 3
    }));
    let width = 0;
    let height = 0;
    let frame = 0;

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function draw(time) {
      frame = requestAnimationFrame(draw);
      context.clearRect(0, 0, width, height);
      context.lineWidth = 1;
      strokes.forEach(stroke => {
        const drift = (time * stroke.speed + stroke.seed) % 1.35;
        const x = stroke.x * width + Math.sin(time * 0.00022 + stroke.seed) * 18;
        const y = (stroke.y * height + drift * height) % (height + 120) - 60;
        const colors = [
          "rgba(255, 241, 176, 0.36)",
          "rgba(107, 191, 154, 0.24)",
          "rgba(177, 92, 72, 0.18)"
        ];
        const gradient = context.createLinearGradient(x, y, x + 16, y + stroke.length);
        gradient.addColorStop(0, "rgba(255,255,255,0)");
        gradient.addColorStop(0.45, colors[stroke.hue]);
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        context.strokeStyle = gradient;
        context.beginPath();
        context.moveTo(x, y);
        context.bezierCurveTo(x + 18, y + stroke.length * 0.28, x - 16, y + stroke.length * 0.66, x + 8, y + stroke.length);
        context.stroke();
      });
    }

    resize();
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(draw);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else if (!document.hidden && !frame) {
        frame = requestAnimationFrame(draw);
      }
    });
  }
})();
