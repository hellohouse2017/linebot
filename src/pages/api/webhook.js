import { Client, middleware } from '@line/bot-sdk';

// 設定檔
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// 初始化 LINE Client
const client = new Client(config);

// 原本的常數設定移到這裡
const URLS = {
  BOOKING_LIFF: "https://liff.line.me/2008582194-wrJ4dqXq",
  SIGNATURE: "https://liff.line.me/2008582194-vLLGoM4M",
  SELF_CHECKIN: "https://liff.line.me/2008582194-P7EnGkNk",
  ROOMS_HELLO: "https://www.hello-stay.com/hellohouse/rooms.html",
  ROOMS_GODIN: "https://www.hello-stay.com/godin/rooms.html",
  TRAFFIC: "https://www.hello-stay.com/hellohouse/traffic.html",
  QA: "https://www.hello-stay.com/hellohouse/agreement.html"
};

const COLORS = { SYSTEM: "#70665C", ACTION: "#9C8673", ALERT: "#B58282", THEME: "#2E7D32", FAQ_BG: "#5D4037" };
const ADMIN_PHONE = "0932828922";

// Vercel API Handler
// ...前面的 import 和設定都不變...

// Vercel API Handler (除錯修正版)
export default async function handler(req, res) {
  // 1. 允許 GET 請求 (讓您可以直接用瀏覽器開啟網址測試)
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'alive',
      message: '你的機器人伺服器運作正常！請回到 LINE Developers 按下 Verify。'
    });
  }

  // 2. 處理 LINE 的 POST 請求
  if (req.method === 'POST') {
    const events = req.body.events;

    // 如果 LINE Verify 送來空事件，直接回傳 200
    if (!events || events.length === 0) {
      return res.status(200).json({ status: 'ok', message: 'Verification successful' });
    }

    try {
      const results = await Promise.all(events.map(async (event) => {
        return handleEvent(event);
      }));
      return res.status(200).json(results);
    } catch (err) {
      console.error("Error handling events:", err);
      // 就算出錯，也回傳 200 給 LINE，避免它一直重試
      return res.status(200).json({ status: 'error', message: err.message });
    }
  }

  // 其他方法回傳 405
  res.setHeader('Allow', ['POST', 'GET']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

// ...後面的 handleEvent 和其他函數保持不變...

// 事件處理主邏輯
async function handleEvent(event) {
  // 1. 處理 Follow (加入好友)
  if (event.type === 'follow') {
    return sendWelcomeMessage(event.replyToken);
  }

  // 2. 處理 Postback (按鈕點擊) - 這邊反應會比 GAS 快非常多
  if (event.type === 'postback') {
    const data = event.postback.data;
    if (data === 'MENU_MAIN') return sendMainMenu(event.replyToken);
    if (data === 'MENU_ROOMS') return sendRoomSelectionCard(event.replyToken);
    if (data === 'FAQ_WIFI') return sendWifiCard(event.replyToken);
    if (data === 'FAQ_FUN') return sendEntertainmentCard(event.replyToken);
    if (data === 'FAQ_ITEMS') return sendAmenitiesCard(event.replyToken);
    if (data === 'FAQ_EARLY') return sendEarlyCheckinCard(event.replyToken);
    if (data === 'FAQ_COOK') return sendCookingCard(event.replyToken);
    if (data === 'FAQ_WATER') return sendWaterCard(event.replyToken);
    if (data === 'FAQ_LOST') return sendCombinedTrafficCard(event.replyToken);
    if (data === 'MAP_IMAGE') return sendMapImage(event.replyToken);
  }

  // 3. 處理文字訊息
  if (event.type === 'message' && event.message.type === 'text') {
    const text = event.message.text.toLowerCase();
    
    if (/選單|主選單|menu|home|功能|幫助|你好|hi|hello/i.test(text)) {
      return sendMainMenu(event.replyToken);
    } 
    else if (/qa|常見問題|q&a|ＱＡ/i.test(text)) {
      return sendQAMenu(event.replyToken);
    }
  }

  return Promise.resolve(null);
}

// --- 以下為 UI 卡片函式 (從 GAS 移植並調整為 LINE SDK 格式) ---

function reply(replyToken, messages) {
  // 確保 messages 是陣列
  const msgArray = Array.isArray(messages) ? messages : [messages];
  return client.replyMessage(replyToken, msgArray);
}

function sendWelcomeMessage(replyToken) {
    // 您的歡迎訊息邏輯...
    const welcomeText = `🏠 歡迎來到 你好哇寓所與溝頂民宿 🤖\n\n我是AI智慧服務，很高興為您服務！\n我們的目標是讓您「動動手指就能搞定一切」。\n\n對話畫面下方有三個功能按鈕，可以協助您輕鬆完成自助服務：\n\n👉 1. 查詢/預定檔期（即時連動日曆）\n    或點擊此段文字下方【立即預訂】按鈕，\n    即可即時查詢兩館的空房日期與預估參考房價，\n    快速完成線上諮詢。\n\n👉 2. 功能選單服務（入住資訊一鍵查）\n    或點擊此段文字下方【查看功能】按鈕，\n    會彈出豐富的功能卡片，包含：\n    • 房型介紹、交通指引、停車資訊\n    • 線上簽約、自助入住登記（超重要！）\n\n👉 3. 常見問題集 (QA)、緊急聯絡管家\n\n期待您的光臨！`;

    const flex = {
        "type": "bubble",
        "body": {
          "type": "box", "layout": "vertical", "spacing": "md",
          "contents": [
            { "type": "button", "style": "primary", "color": COLORS.THEME, "action": { "type": "uri", "label": "立即預訂 (查詢房況)", "uri": URLS.BOOKING_LIFF } },
            { "type": "button", "style": "secondary", "action": { "type": "postback", "label": "查看功能 (主選單)", "data": "MENU_MAIN" } }
          ]
        }
    };

    return reply(replyToken, [{ type: 'text', text: welcomeText }, { type: 'flex', altText: '主功能引導', contents: flex }]);
}

function sendMainMenu(replyToken) {
    // 您的主選單 JSON ... (省略重複結構，直接用您原本的 JSON 邏輯)
    // 這裡為了版面整潔，我示範一個，其他的請依照您原本的 JSON 結構放入
    const flexPayload = {
      "type": "bubble",
      "header": { "type": "box", "layout": "vertical", "backgroundColor": COLORS.SYSTEM, "paddingAll": "lg", "contents": [{ "type": "text", "text": "你好哇寓所 | 服務選單", "color": "#FFFFFF", "weight": "bold", "size": "lg" }] },
      "body": {
        "type": "box", "layout": "vertical", "spacing": "md",
        "contents": [
          { "type": "text", "text": "請選擇您需要的服務：", "size": "sm", "color": "#aaaaaa", "align": "center" },
          { "type": "separator", "margin": "md" },
          { "type": "box", "layout": "horizontal", "spacing": "sm", "margin": "md", "contents": [
              { "type": "button", "style": "primary", "color": COLORS.THEME, "height": "sm", "action": { "type": "postback", "label": "🏠 房型介紹", "data": "MENU_ROOMS" } },
              { "type": "button", "style": "secondary", "height": "sm", "action": { "type": "uri", "label": "💡 入住須知", "uri": URLS.QA } }
          ]},
          { "type": "box", "layout": "horizontal", "spacing": "sm", "margin": "sm", "contents": [
              { "type": "button", "style": "secondary", "height": "sm", "action": { "type": "uri", "label": "📝 線上簽約", "uri": URLS.SIGNATURE } },
              { "type": "button", "style": "secondary", "height": "sm", "color": COLORS.ACTION, "action": { "type": "uri", "label": "📸 自助登記", "uri": URLS.SELF_CHECKIN } }
          ]},
          { "type": "box", "layout": "horizontal", "spacing": "sm", "margin": "sm", "contents": [
              { "type": "button", "style": "secondary", "height": "sm", "action": { "type": "uri", "label": "🅿️ 停車資訊", "uri": URLS.TRAFFIC } },
              { "type": "button", "style": "primary", "color": COLORS.ALERT, "height": "sm", "action": { "type": "uri", "label": "🆘 緊急連絡", "uri": "tel:" + ADMIN_PHONE } }
          ]}
        ]
      }
    };
    return reply(replyToken, { type: 'flex', altText: '主選單', contents: flexPayload });
}

function sendQAMenu(replyToken) {
    // 移植您的 QA Menu ...
    const flexPayload = {
        "type": "bubble",
        "header": { "type": "box", "layout": "vertical", "backgroundColor": COLORS.FAQ_BG, "paddingAll": "lg", "contents": [{ "type": "text", "text": "💡 常見問題集", "color": "#FFFFFF", "weight": "bold", "size": "lg" }] },
        "body": {
          "type": "box", "layout": "vertical", "spacing": "md",
          "contents": [
            { "type": "text", "text": "我們精選客人常見問題給您參考，希望快速協助到您：", "size": "sm", "color": "#aaaaaa", "align": "center", "wrap": true },
            { "type": "separator", "margin": "md" },
            { "type": "button", "style": "secondary", "height": "sm", "margin": "md", "action": { "type": "postback", "label": "📶 請問 WiFi 密碼多少？", "data": "FAQ_WIFI" } },
            { "type": "button", "style": "secondary", "height": "sm", "margin": "sm", "action": { "type": "postback", "label": "🀄 請問有麻將或 KTV 嗎？", "data": "FAQ_FUN" } },
            { "type": "button", "style": "secondary", "height": "sm", "margin": "sm", "action": { "type": "postback", "label": "🚰 請問有提供飲用水嗎？", "data": "FAQ_WATER" } },
            { "type": "button", "style": "secondary", "height": "sm", "margin": "sm", "action": { "type": "postback", "label": "🧴 請問有提供備品嗎？", "data": "FAQ_ITEMS" } },
            { "type": "button", "style": "secondary", "height": "sm", "margin": "sm", "action": { "type": "postback", "label": "🕒 請問可以提早入住嗎？", "data": "FAQ_EARLY" } },
            { "type": "button", "style": "secondary", "height": "sm", "margin": "sm", "action": { "type": "postback", "label": "🍳 請問可以開伙烹飪嗎？", "data": "FAQ_COOK" } },
            { "type": "button", "style": "secondary", "color": COLORS.ACTION, "height": "sm", "margin": "sm", "action": { "type": "postback", "label": "🗺️ 我找不到路怎麼辦？", "data": "FAQ_LOST" } },
            { "type": "separator", "margin": "lg" },
            { "type": "button", "style": "primary", "color": COLORS.ALERT, "height": "sm", "margin": "lg", "action": { "type": "uri", "label": "📞 立刻打給管家", "uri": "tel:" + ADMIN_PHONE } }
          ]
        }
    };
    return reply(replyToken, { type: 'flex', altText: 'QA選單', contents: flexPayload });
}

// 簡單的卡片處理 (因為篇幅限制，我先把架構給您，其他的函數請把 GAS 裡的 JSON 複製過來即可)
// 範例：Wifi Card
function sendWifiCard(replyToken) {
    const c = { "type": "bubble", "header": { "type": "box", "layout": "vertical", "backgroundColor": "#546E7A", "contents": [{ "type": "text", "text": "📶 WiFi 連線", "color": "#FFFFFF", "weight": "bold", "size": "lg" }] }, "body": { "type": "box", "layout": "vertical", "contents": [{ "type": "box", "layout": "vertical", "backgroundColor": "#ECEFF1", "cornerRadius": "md", "paddingAll": "lg", "contents": [{ "type": "text", "text": "ID: Hellohouse", "size": "md", "color": "#546E7A", "weight": "bold", "align": "center" }, { "type": "separator", "margin": "md" }, { "type": "text", "text": "kao828922", "size": "3xl", "color": "#5D8AA8", "weight": "bold", "align": "center", "margin": "md" }] }] } };
    return reply(replyToken, { type: 'flex', altText: 'WiFi', contents: c });
}

function sendMapImage(replyToken) {
    const fileId = "1y65bNZ07t_6L2CCLiW0bPgLRT4Vc_LcK";
    const directUrl = "https://drive.google.com/uc?export=view&id=" + fileId;
    // 注意：Image 訊息需要 originalContentUrl 和 previewImageUrl
    return reply(replyToken, { type: "image", originalContentUrl: directUrl, previewImageUrl: directUrl });
}

// ... 請將其他 sendEntertainmentCard, sendAmenitiesCard 等函數同樣移植過來
// 只需要把 replyToLine 改成上面的 reply 函式即可。
function sendRoomSelectionCard(replyToken) {
    const flexPayload = {
        "type": "bubble",
        "header": { "type": "box", "layout": "vertical", "backgroundColor": COLORS.SYSTEM, "paddingAll": "lg", "contents": [{ "type": "text", "text": "🏠 請選擇館別", "color": "#FFFFFF", "weight": "bold", "size": "lg" }] },
        "body": {
          "type": "box", "layout": "vertical", "spacing": "md",
          "contents": [
            { "type": "text", "text": "請選擇您想查看房型的民宿：", "size": "sm", "color": "#555555", "align": "center" },
            { "type": "separator", "margin": "md" },
            { "type": "button", "style": "secondary", "height": "sm", "color": COLORS.THEME, "action": { "type": "uri", "label": "你好哇寓所 (主館)", "uri": URLS.ROOMS_HELLO } },
            { "type": "button", "style": "secondary", "height": "sm", "margin": "md", "color": "#8D6E63", "action": { "type": "uri", "label": "溝頂民宿 (二館)", "uri": URLS.ROOMS_GODIN } }
          ]
        }
    };
    return reply(replyToken, { type: 'flex', altText: '選擇館別', contents: flexPayload });
}

function sendEntertainmentCard(replyToken) {
    const c = { "type": "bubble", "header": { "type": "box", "layout": "vertical", "backgroundColor": COLORS.SYSTEM, "paddingAll": "lg", "contents": [{ "type": "text", "text": "🀄 娛樂設施", "color": "#FFFFFF", "weight": "bold", "size": "lg" }] }, "body": { "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": "✅ 提供項目：", "weight": "bold", "color": COLORS.THEME, "size": "sm" }, { "type": "text", "text": "• 電視\n• 麻將 (含手動桌、牌具、牌尺)\n• 撲克牌", "size": "sm", "color": "#555555", "wrap": true, "margin": "sm", "lineSpacing": "6px" }, { "type": "separator", "margin": "md" }, { "type": "text", "text": "🚫 無 KTV：\n住宅區請勿自備麥克風喧嘩。", "size": "sm", "color": COLORS.ALERT, "wrap": true, "margin": "md" }] } };
    return reply(replyToken, { type: "flex", altText: "娛樂設施", contents: c });
}
function sendAmenitiesCard(replyToken) {
    const c = { "type": "bubble", "header": { "type": "box", "layout": "vertical", "backgroundColor": COLORS.SYSTEM, "paddingAll": "lg", "contents": [{ "type": "text", "text": "🧴 備品說明", "color": "#FFFFFF", "weight": "bold", "size": "lg" }] }, "body": { "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": "✅ 提供：大浴巾、沐浴乳、洗髮乳、吹風機。", "size": "sm", "color": "#555555", "wrap": true }, { "type": "separator", "margin": "md" }, { "type": "text", "text": "❌ 不提供：牙膏牙刷、刮鬍刀、毛巾等個人盥洗用具。", "size": "sm", "color": COLORS.ALERT, "wrap": true, "margin": "md" }] } };
    return reply(replyToken, { type: "flex", altText: "備品", contents: c });
}
function sendEarlyCheckinCard(replyToken) {
    const flexPayload = {
        "type": "bubble", "header": { "type": "box", "layout": "vertical", "backgroundColor": COLORS.ACTION, "paddingAll": "lg", "contents": [{ "type": "text", "text": "🕒 關於提早入住", "color": "#FFFFFF", "weight": "bold", "size": "lg" }] }, "body": { "type": "box", "layout": "vertical", "contents": [{ "type": "box", "layout": "baseline", "contents": [{ "type": "text", "text": "標準入住時間", "color": "#aaaaaa", "size": "sm", "flex": 2 }, { "type": "text", "text": "16:00 後", "color": "#333333", "size": "xl", "flex": 3, "weight": "bold" }] }, { "type": "separator", "margin": "md" }, { "type": "text", "text": "若房務提早清潔完畢，我們很樂意讓您提早入內休息。", "size": "sm", "color": "#555555", "wrap": true, "margin": "md" }, { "type": "text", "text": "💡 在那之前，您可以...", "weight": "bold", "size": "sm", "color": COLORS.ACTION, "margin": "md" }] }, "footer": { "type": "box", "layout": "vertical", "spacing": "sm", "contents": [{ "type": "button", "style": "secondary", "action": { "type": "uri", "label": "📍 查看交通導航", "uri": URLS.TRAFFIC } }, { "type": "button", "style": "secondary", "action": { "type": "uri", "label": "📸 先辦自助登記", "uri": URLS.SELF_CHECKIN } }, { "type": "button", "style": "primary", "color": COLORS.ACTION, "action": { "type": "uri", "label": "📞 聯絡管家確認", "uri": "tel:" + ADMIN_PHONE } }] }
      };
      return reply(replyToken, { type: "flex", altText: "提早入住說明", contents: flexPayload });
}
function sendCookingCard(replyToken) {
    const flexPayload = {
        "type": "bubble", "header": { "type": "box", "layout": "vertical", "backgroundColor": COLORS.SYSTEM, "paddingAll": "lg", "contents": [{ "type": "text", "text": "🍳 廚房烹飪說明", "color": "#FFFFFF", "weight": "bold", "size": "lg" }] }, "body": { "type": "box", "layout": "vertical", "contents": [{ "type": "text", "text": "🏠 你好哇寓所 (主館)", "weight": "bold", "color": COLORS.THEME, "size": "sm" }, { "type": "text", "text": "✅ 歡迎開伙！\n提供大中島與相關廚房用品。", "size": "sm", "color": "#555555", "wrap": true, "margin": "xs", "lineSpacing": "4px" }, { "type": "separator", "margin": "lg" }, { "type": "text", "text": "🏠 溝頂民宿 (二館)", "weight": "bold", "color": "#8D6E63", "size": "sm", "margin": "lg" }, { "type": "text", "text": "❌ 無法開伙\n僅提供微波爐與簡易流理臺。", "size": "sm", "color": "#555555", "wrap": true, "margin": "xs", "lineSpacing": "4px" }, { "type": "box", "layout": "vertical", "backgroundColor": "#FFEBEE", "cornerRadius": "md", "paddingAll": "md", "margin": "lg", "contents": [{ "type": "text", "text": "⚠️ 特別注意", "color": "#C62828", "weight": "bold", "size": "sm" }, { "type": "text", "text": "因為沒有排煙設備，千萬不可以明火或自行帶電磁爐烹飪！", "color": "#C62828", "size": "sm", "wrap": true, "margin": "sm", "weight": "bold" }] }] }
      };
    return reply(replyToken, { type: "flex", altText: "烹飪說明", contents: flexPayload });
}
function sendWaterCard(replyToken) {
    const c = {
        "type": "bubble",
        "header": { "type": "box", "layout": "vertical", "backgroundColor": COLORS.SYSTEM, "paddingAll": "lg", "contents": [{ "type": "text", "text": "🚰 飲用水說明", "color": "#FFFFFF", "weight": "bold", "size": "lg" }] },
        "body": {
          "type": "box", "layout": "vertical", "contents": [
            { "type": "text", "text": "一樓廚房水槽右邊的水龍頭：", "weight": "bold", "size": "md", "color": "#333333", "wrap": true },
            { "type": "separator", "margin": "md" },
            { "type": "text", "text": "✅ 左側 (小的)：RO 過濾水", "weight": "bold", "size": "sm", "color": COLORS.THEME, "margin": "md" },
            { "type": "text", "text": "我們有定期更換濾心，請安心飲用。", "size": "xs", "color": "#666666", "wrap": true },
            { "type": "separator", "margin": "md" },
            { "type": "text", "text": "❌ 右側 (大的)：自來水", "weight": "bold", "size": "sm", "color": COLORS.ALERT, "margin": "md" },
            { "type": "text", "text": "請小心不要誤喝！", "size": "xs", "color": "#666666", "wrap": true }
          ]
        }
      };
      return reply(replyToken, { type: "flex", altText: "飲用水說明", contents: c });
}
function sendCombinedTrafficCard(replyToken) {
    const MAPS = {
        ROUTE_1: "https://www.google.com/maps/search/?api=1&query=七福便當+高雄",
        ROUTE_2: "https://www.google.com/maps/search/?api=1&query=阿英排骨飯+高雄",
        ROUTE_3: "https://www.google.com/maps/search/?api=1&query=老蔡虱目魚粥+高雄",
        GODIN_START: "https://www.google.com/maps/search/?api=1&query=老蔡虱目魚粥+高雄"
      };
      const flexPayload = {
        "type": "bubble", "size": "mega",
        "header": { "type": "box", "layout": "vertical", "backgroundColor": COLORS.SYSTEM, "paddingAll": "lg", "contents": [{ "type": "text", "text": "🗺️ 迷路指南", "color": "#FFFFFF", "weight": "bold", "size": "lg" }] },
        "body": {
          "type": "box", "layout": "vertical", "spacing": "md",
          "contents": [
            { "type": "text", "text": "🚗 你好哇寓所 (Hello House)", "weight": "bold", "color": COLORS.THEME, "size": "md" },
            { "type": "text", "text": "⚠️ 巷弄內無法開車，請先停好車。", "color": "#C62828", "size": "xs", "wrap": true },
    
            { "type": "text", "text": "1. 大公路 (七福便當)：", "weight": "bold", "size": "sm", "color": "#333333", "margin": "sm" },
            { "type": "text", "text": "面對便當店走「左手邊」巷子，直走30公尺右手邊抵達。", "size": "sm", "color": "#666666", "wrap": true },
            { "type": "button", "style": "secondary", "height": "sm", "action": { "type": "uri", "label": "📍 導航至七福便當", "uri": MAPS.ROUTE_1 } },
    
            { "type": "text", "text": "2. 富野路 (阿英排骨)：", "weight": "bold", "size": "sm", "color": "#333333", "margin": "sm" },
            { "type": "text", "text": "面對店面走「左手邊」巷子，直走左前方80公尺抵達。", "size": "sm", "color": "#666666", "wrap": true },
            { "type": "button", "style": "secondary", "height": "sm", "action": { "type": "uri", "label": "📍 導航至阿英排骨", "uri": MAPS.ROUTE_2 } },
    
            { "type": "text", "text": "3. 瀨南街 (老蔡虱目魚)：", "weight": "bold", "size": "sm", "color": "#333333", "margin": "sm" },
            { "type": "text", "text": "面對店面走「右手邊」巷子，路口右轉，數來第二間。", "size": "sm", "color": "#666666", "wrap": true },
            { "type": "button", "style": "secondary", "height": "sm", "action": { "type": "uri", "label": "📍 導航至老蔡虱目魚", "uri": MAPS.ROUTE_3 } },
    
            { "type": "separator", "margin": "lg" },
    
            { "type": "text", "text": "🏚️ 溝頂民宿 (Godin B&B)", "weight": "bold", "color": "#8D6E63", "size": "md", "margin": "lg" },
            { "type": "text", "text": "⚠️ 位置隱密車進不來，請在瀨南街停車。", "color": "#C62828", "size": "xs", "wrap": true },
    
            { "type": "text", "text": "唯一路線 (老蔡虱目魚)：", "weight": "bold", "size": "sm", "color": "#333333", "margin": "sm" },
            { "type": "text", "text": "面對虱目魚店面走「右手邊」巷子，進來右手邊第六間。", "size": "sm", "color": "#666666", "wrap": true },
            { "type": "button", "style": "secondary", "height": "sm", "action": { "type": "uri", "label": "📍 導航至老蔡虱目魚", "uri": MAPS.GODIN_START } }
          ]
        }
      };
      return reply(replyToken, { type: "flex", altText: "迷路指南", contents: flexPayload });
}
