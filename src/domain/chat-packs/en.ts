import type { ChatPack } from "./types";

export const enPack: ChatPack = {
  weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  closedWord: "closed",
  unresolved: /(don't have (that|this|the) information|do not have (that|this|the) information|leave your (name|phone|number)|contact (a |our )?(staff|team|agent)|can't answer|cannot answer|not able to answer)/i,
  safeText: "I need to double-check this with the shop to be accurate. Please leave your phone number and our staff will get back to you shortly.",
  rulesFallback: "I'm in basic mode right now and can only share the matching items shown below. For details or a quote, please leave your name and phone number and our staff will contact you.",
  recap: { customer: "Customer", agent: "Agent", assistant: "Assistant", head: "[Summary of earlier turns]", end: "[End of summary]" },
  directive:
    "LANGUAGE: Reply to the customer ONLY in English, even if the customer writes in Vietnamese or any other language — this shop's chatbot language is fixed to English by its owner. Only switch language if the customer explicitly asks you to. Product data, tool results and shop information may be written in Vietnamese: translate them naturally (keep product names and SKUs as they are; keep prices in VND with the ₫ symbol; say 'box'/'piece' etc. in English). Never mix Vietnamese words into your reply.",
  template(kind, c) {
    switch (kind) {
      case "greeting":
        return `Hi! I'm ${c.botName}. Which product or service are you interested in, or how can I help?`;
      case "thanks_bye":
        return `Thanks for visiting ${c.shopName}! Message me anytime you need something.`;
      case "ask_contact":
        return [`${c.shopName}:`, c.address && `• Address: ${c.address}`, c.phone && `• Hotline: ${c.phone}`, c.email && `• Email: ${c.email}`, `• Opening hours: ${c.hours}`].filter(Boolean).join("\n");
      case "booking":
        return "Please pick a service and a time slot in the form below — it takes less than a minute.";
      case "refuse_off_topic":
        return `I'm the assistant of ${c.shopName}, so I can only help with the shop's products, services and bookings. Is there anything about the shop I can help with?`;
      case "refuse_abuse":
        return "I'm always glad to help whenever you need advice about the shop's products or services.";
      case "refuse_injection":
        return `I can only help with information about ${c.shopName}. Would you like product advice or to book an appointment?`;
    }
  },
  handoff(reason, open, liveChat) {
    const apology = reason === "complaint" || reason === "negative_sentiment";
    const asked = reason === "customer_request";
    const intro = apology ? "I'm sorry about your experience." : asked ? "I'll connect you with our staff right away." : "I need our staff to help with this so the answer is accurate.";
    const when = open
      ? liveChat
        ? "A staff member will join this chat as soon as possible, or you can leave your number and we'll call you back."
        : "Please leave your phone number and our staff will call you back within minutes."
      : "We're currently closed — please leave your phone number and our staff will contact you when we open.";
    return `${intro} ${when}`;
  },
  defaultTexts: (shopName) => ({
    greeting: `Hi! I'm the assistant of ${shopName}. I can recommend products, book appointments or connect you with our staff.`,
    quickReplies: ["Product advice", "Book an appointment", "Opening hours", "Talk to staff"],
  }),
  themeTexts: (shopName) => ({ botName: `${shopName} Assistant`, headerSubtitle: "Usually replies instantly", launcherLabel: "Chat with us" }),
};
