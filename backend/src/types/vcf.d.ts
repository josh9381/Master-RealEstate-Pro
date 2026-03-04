declare module 'vcf' {
  interface VCardProperty {
    valueOf(): string;
    toJSON(): any;
  }

  class VCard {
    get(property: string): VCardProperty | undefined;
    toString(): string;
  }

  function parse(input: string): VCard[];

  export = { parse, VCard };
}
