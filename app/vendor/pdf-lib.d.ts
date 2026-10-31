// Minimal typings for the vendored pdf-lib ESM bundle (v1.17.1, MIT). Only what app/screens/shagun-pdf.ts uses.
declare module '*/vendor/pdf-lib.esm.js' {
  export interface PDFFont { widthOfTextAtSize(text: string, size: number): number; }
  export interface RGB { type: 'RGB'; red: number; green: number; blue: number; }
  export interface PDFPage {
    drawText(text: string, opts: { x: number; y: number; size: number; font?: PDFFont; color?: RGB }): void;
    drawLine(opts: { start: { x: number; y: number }; end: { x: number; y: number }; thickness?: number; color?: RGB }): void;
    drawRectangle(opts: { x: number; y: number; width: number; height: number; color?: RGB; borderColor?: RGB; borderWidth?: number }): void;
  }
  export class PDFDocument {
    static create(): Promise<PDFDocument>;
    addPage(size?: [number, number]): PDFPage;
    embedFont(font: string): Promise<PDFFont>;
    setTitle(t: string): void; setProducer(t: string): void; setCreator(t: string): void;
    save(): Promise<Uint8Array>;
  }
  export const StandardFonts: { Helvetica: string; HelveticaBold: string; TimesRoman: string; TimesRomanItalic: string };
  export function rgb(r: number, g: number, b: number): RGB;
}
