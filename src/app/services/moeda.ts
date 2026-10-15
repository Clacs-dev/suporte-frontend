// Maximo de casas decimais aceites na escrita de valores
export const MAX_DECIMAIS = 10;

function formatarInteiro(digitos: string): string {
    const limpo = digitos.replace(/\D/g, "");
    if (!limpo) return "0";
    return limpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatarMoedaInput(v: string): string {
    let s = v.replace(/[^\d.,]/g, "");
    if (!s) return "";

    const lastComma = s.lastIndexOf(",");
    if (lastComma === -1) {
        return formatarInteiro(s.replace(/\./g, ""));
    }

    const intRaw = s.slice(0, lastComma).replace(/[.,]/g, "");
    // Casas decimais ficam todas depois da virgula (ate MAX_DECIMAIS); nunca passam para a parte inteira
    const decRaw = s.slice(lastComma + 1).replace(/[.,]/g, "").slice(0, MAX_DECIMAIS);

    return `${formatarInteiro(intRaw)},${decRaw}`;
}

export function normalizarMoeda(v: string): string {
    let s = v.replace(/[^\d.,]/g, "");
    if (!s) return "0,00";

    let intRaw: string;
    let dec: string;
    if (s.includes(",")) {
        const idx = s.lastIndexOf(",");
        intRaw = s.slice(0, idx);
        dec = s.slice(idx + 1).replace(/[.,]/g, "");
    } else {
        const parts = s.split(".");
        if (parts.length === 2 && parts[1].length >= 1 && parts[1].length <= 2 && !parts[0].includes(".")) {
            intRaw = parts[0];
            dec = parts[1];
        } else {
            intRaw = s;
            dec = "";
        }
    }
    const num = (intRaw.replace(/[.,]/g, "") || "0");
    const intFmt = num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    // Pelo menos 2 casas decimais; as restantes que o utilizador escreveu mantem-se
    return `${intFmt},${dec.padEnd(2, "0").slice(0, MAX_DECIMAIS)}`;
}

// maxDecimais > decimais mostra as casas decimais extra que o valor tiver (sem zeros a direita)
export function formatarMoedaExibicao(v: number | string | null | undefined, decimais = 2, maxDecimais = decimais): string {
    const n = typeof v === "number" ? v : parseMoeda(String(v ?? ""));
    const num = isNaN(n) ? 0 : n;
    const sinal = num < 0 ? "-" : "";
    let fixo = Math.abs(num).toFixed(Math.max(decimais, maxDecimais));
    // Representacao mais curta do numero: evita "ruido" de virgula flutuante nas ultimas casas
    const curto = String(Number(fixo));
    if (maxDecimais > decimais && !curto.includes("e")) fixo = curto;
    let [inteiro, decimal = ""] = fixo.split(".");
    decimal = decimal.padEnd(decimais, "0");
    while (decimal.length > decimais && decimal.endsWith("0")) decimal = decimal.slice(0, -1);
    const intFmt = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return decimais > 0 ? `${sinal}${intFmt},${decimal}` : `${sinal}${intFmt}`;
}

export function parseMoeda(v: string): number {
    if (!v) return NaN;
    const s = String(v).replace(/[^\d.,-]/g, "");
    if (!s) return NaN;

    let intRaw: string;
    let dec: string;
    if (s.includes(",")) {
        const idx = s.lastIndexOf(",");
        intRaw = s.slice(0, idx);
        dec = s.slice(idx + 1);
    } else {
        const parts = s.split(".");
        if (parts.length === 2 && parts[1].length >= 1 && parts[1].length <= 2 && !parts[0].includes(".")) {
            intRaw = parts[0];
            dec = parts[1];
        } else {
            intRaw = s;
            dec = "";
        }
    }
    const intLimpo = intRaw.replace(/[.,]/g, "") || "0";
    const decLimpo = dec.replace(/[.,]/g, "").slice(0, MAX_DECIMAIS) || "0";
    const n = parseFloat(`${intLimpo}.${decLimpo}`);
    return isNaN(n) ? NaN : n;
}

// Numero (ex.: vindo da API) -> texto do campo, sem perder casas decimais: 100000.47578 -> "100.000,47578"
export function numeroParaMoedaInput(n: number): string {
    return formatarMoedaExibicao(n, 2, MAX_DECIMAIS);
}
