/**
 * Leitura do `user-agent`: que aparelho, que sistema e que navegador.
 *
 * É de propósito um parser pequeno em vez de uma biblioteca — o painel
 * admin só precisa de agrupar acessos, não de identificar cada modelo.
 */

export type DeviceType = "mobile" | "tablet" | "desktop" | "bot" | "desconhecido";

export type ParsedUserAgent = {
  deviceType: DeviceType;
  /** marca/modelo quando o UA diz, ex.: "iPhone", "Samsung SM-G991B" */
  deviceModel: string | null;
  /** sistema operativo com versão, ex.: "Android 14", "Windows 11" */
  os: string | null;
  /** navegador com versão, ex.: "Chrome 129" */
  browser: string | null;
};

const empty: ParsedUserAgent = {
  deviceType: "desconhecido",
  deviceModel: null,
  os: null,
  browser: null,
};

function match(ua: string, re: RegExp): string | null {
  return ua.match(re)?.[1] ?? null;
}

function deviceTypeOf(ua: string): DeviceType {
  if (/bot|crawler|spider|crawling|headlesschrome|lighthouse/i.test(ua)) return "bot";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|windows phone|blackberry/i.test(ua)) return "mobile";
  if (/windows|macintosh|linux|cros|x11/i.test(ua)) return "desktop";
  return "desconhecido";
}

function osOf(ua: string): string | null {
  const windows = match(ua, /windows nt ([\d.]+)/i);
  if (windows) {
    const names: Record<string, string> = {
      "10.0": "10/11", // o UA não distingue o 11 do 10
      "6.3": "8.1",
      "6.2": "8",
      "6.1": "7",
    };
    return `Windows ${names[windows] ?? windows}`;
  }

  const android = match(ua, /android[ /]([\d.]+)/i);
  if (android) return `Android ${android}`;

  const ios = match(ua, /(?:iphone )?os ([\d_]+) like mac os/i);
  if (ios) return `iOS ${ios.replace(/_/g, ".")}`;

  const mac = match(ua, /mac os x ([\d_.]+)/i);
  if (mac) return `macOS ${mac.replace(/_/g, ".")}`;

  if (/cros/i.test(ua)) return "ChromeOS";
  if (/ubuntu/i.test(ua)) return "Ubuntu";
  if (/linux/i.test(ua)) return "Linux";
  if (/macintosh/i.test(ua)) return "macOS";
  return null;
}

function browserOf(ua: string): string | null {
  // a ordem importa: quase todos se dizem "Safari" e "Chrome"
  const edge = match(ua, /edg(?:e|a|ios)?\/([\d.]+)/i);
  if (edge) return `Edge ${edge.split(".")[0]}`;

  const opera = match(ua, /(?:opr|opera)[ /]([\d.]+)/i);
  if (opera) return `Opera ${opera.split(".")[0]}`;

  const samsung = match(ua, /samsungbrowser\/([\d.]+)/i);
  if (samsung) return `Samsung Internet ${samsung.split(".")[0]}`;

  const firefox = match(ua, /(?:firefox|fxios)\/([\d.]+)/i);
  if (firefox) return `Firefox ${firefox.split(".")[0]}`;

  const chrome = match(ua, /(?:chrome|crios)\/([\d.]+)/i);
  if (chrome) return `Chrome ${chrome.split(".")[0]}`;

  const safari = match(ua, /version\/([\d.]+).*safari/i);
  if (safari) return `Safari ${safari.split(".")[0]}`;

  return null;
}

function modelOf(ua: string): string | null {
  if (/ipad/i.test(ua)) return "iPad";
  if (/ipod/i.test(ua)) return "iPod";
  if (/iphone/i.test(ua)) return "iPhone";

  // Android: "...; Android 14; SM-G991B) AppleWebKit..."
  const android = match(ua, /android[^;)]*;\s*([^;)]+?)(?:\s+build\/[^;)]*)?\)/i);
  if (android && !/^[\d.\s]*$/.test(android)) return android.trim();

  if (/macintosh/i.test(ua)) return "Mac";
  return null;
}

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua) return empty;
  return {
    deviceType: deviceTypeOf(ua),
    deviceModel: modelOf(ua),
    os: osOf(ua),
    browser: browserOf(ua),
  };
}

const deviceLabels: Record<DeviceType, string> = {
  mobile: "Telemóvel",
  tablet: "Tablet",
  desktop: "Computador",
  bot: "Robô",
  desconhecido: "Desconhecido",
};

export function deviceLabel(type: string | null | undefined): string {
  return deviceLabels[(type ?? "desconhecido") as DeviceType] ?? "Desconhecido";
}
