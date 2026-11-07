import type { ChatPack } from "./types";

export const viPack: ChatPack = {
  weekdays: ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"],
  closedWord: "nghỉ",
  unresolved: /(chưa có thông tin|không có thông tin|chưa rõ thông tin|để lại số điện thoại|liên hệ nhân viên|chưa thể trả lời)/i,
  safeText: "Mình cần kiểm tra lại chính xác thông tin này với cửa hàng. Bạn để lại số điện thoại, nhân viên sẽ báo lại ngay nhé.",
  rulesFallback: "",
  recap: { customer: "Khách", agent: "Nhân viên", assistant: "Trợ lý", head: "[Tóm tắt các lượt trước]", end: "[Hết tóm tắt]" },
  directive: "",
  template(kind, c) {
    switch (kind) {
      case "greeting":
        return `Chào bạn! Mình là ${c.botName}. Bạn đang quan tâm sản phẩm/dịch vụ nào, hoặc cần mình hỗ trợ gì ạ?`;
      case "thanks_bye":
        return `Cảm ơn bạn đã ghé ${c.shopName}! Cần gì bạn cứ nhắn mình nhé.`;
      case "ask_contact":
        return [`Thông tin ${c.shopName}:`, c.address && `• Địa chỉ: ${c.address}`, c.phone && `• Hotline: ${c.phone}`, c.email && `• Email: ${c.email}`, `• Giờ mở cửa: ${c.hours}`].filter(Boolean).join("\n");
      case "booking":
        return "Bạn chọn dịch vụ và khung giờ phù hợp ở form bên dưới giúp mình nhé — chỉ mất chưa tới 1 phút.";
      case "refuse_off_topic":
        return `Mình là trợ lý của ${c.shopName} nên chỉ hỗ trợ được các câu hỏi về sản phẩm, dịch vụ và đặt lịch của shop thôi ạ. Bạn cần tư vấn gì về shop không?`;
      case "refuse_abuse":
        return "Mình luôn sẵn sàng hỗ trợ khi bạn cần tư vấn về sản phẩm hoặc dịch vụ của shop nhé.";
      case "refuse_injection":
        return `Mình chỉ có thể hỗ trợ thông tin về ${c.shopName}. Bạn cần tư vấn sản phẩm hay đặt lịch không ạ?`;
    }
  },
  handoff(reason, open, liveChat) {
    const apology = reason === "complaint" || reason === "negative_sentiment";
    const asked = reason === "customer_request";
    const intro = apology ? "Mình rất tiếc về trải nghiệm của bạn." : asked ? "Mình sẽ kết nối bạn với nhân viên ngay." : "Câu này mình cần nhân viên của shop hỗ trợ để trả lời chính xác.";
    const when = open
      ? liveChat
        ? "Nhân viên sẽ vào cuộc trò chuyện này sớm nhất, hoặc bạn để lại số để được gọi lại."
        : "Bạn để lại số điện thoại, nhân viên sẽ gọi lại trong ít phút."
      : "Hiện ngoài giờ làm việc — bạn để lại số điện thoại, nhân viên sẽ liên hệ khi mở cửa.";
    return `${intro} ${when}`;
  },
  defaultTexts: (shopName) => ({
    greeting: `Xin chào! Mình là trợ lý của ${shopName}. Mình có thể tư vấn sản phẩm, đặt lịch hẹn hoặc kết nối bạn với nhân viên.`,
    quickReplies: ["Tư vấn sản phẩm", "Đặt lịch hẹn", "Giờ mở cửa", "Gặp nhân viên"],
  }),
  themeTexts: (shopName) => ({ botName: `Trợ lý ${shopName}`, headerSubtitle: "Thường trả lời ngay", launcherLabel: "Chat với chúng tôi" }),
};
