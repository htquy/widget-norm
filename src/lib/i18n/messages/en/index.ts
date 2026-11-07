import { chrome } from "./chrome";
import { home } from "./home";
import { admin } from "./admin";
import { adminPages } from "./admin-pages";
import { adminMore } from "./admin-more";
import { adminForms } from "./admin-forms";
import { bots } from "./bots";
import { languages } from "./languages";
import { site } from "./site";
import { labels } from "./labels";
import { botPages } from "./bot-pages";
import { adminBots } from "./admin-bots";

/** Bản dịch tiếng Anh của giao diện website + admin. Khoá = câu tiếng Việt gốc. Thêm file mới ở đây. */
export const en: Record<string, string> = { ...site, ...labels, ...botPages, ...adminBots, ...chrome, ...home, ...admin, ...adminPages, ...adminMore, ...adminForms, ...bots, ...languages };
