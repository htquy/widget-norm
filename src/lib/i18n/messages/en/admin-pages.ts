/** Mục menu riêng của từng loại bot + các câu có biến */
export const adminPages: Record<string, string> = {
  "Sản phẩm": "Products",
  "Nội thất": "Furniture",
  "Khoá học": "Courses",
  "Mẫu gạch": "Tile catalog",
  "Báo giá & A/B test": "Quotes & A/B tests",
  "Từ {from} đến {to}": "From {from} to {to}",
  "{p} người mở chat": "{p} of chat openers",
  "{n} đơn": "{n} orders",
  "{n} lần gọi LLM": "{n} LLM calls",
  "jev: {s} s/lượt": "jev: {s} s/turn",
  "Chào {name}, cùng xem khách đang cần gì.": "Hi {name}, let's see what your customers need.",
  "Đang dùng thử — còn {n} ngày.": "Trial in progress — {n} days left.",
  "Quản lý chatbot ({n})": "Manage chatbots ({n})",
  "ngày": "days",
  "Khoảng thời gian": "Time range",
};

Object.assign(adminPages, {
  "Gói {plan}: {n}/{max} chatbot": "{plan} plan: {n}/{max} chatbots",
  "dùng thử đến {date}": "trial until {date}",
  "Gói {plan} đã dùng hết {max} chatbot.": "Your {plan} plan has used all {max} chatbots.",
});
