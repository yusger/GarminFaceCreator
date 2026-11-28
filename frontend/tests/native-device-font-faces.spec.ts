import {test,expect} from "@playwright/test";
import {deviceMetadata} from "../src/deviceMetadata";
import {generationDevice} from "../src/devices";
test("Venu automatic font names expose exact SDK identities rather than generic family guesses",()=>{
 for(const target of ["venu445mm","venu441mm"]){
  const facts=deviceMetadata(target)!;expect(facts.status).toBe("sdk-package");expect(facts.vectorFontFaces).toContain("RobotoRegular");expect(facts.vectorFontFaces).toContain("RobotoCondensedBold");expect(facts.vectorFontFaces).not.toContain("Roboto");
  const d=generationDevice({target});expect(d.metadata.vectorFontFaces).toEqual(facts.vectorFontFaces);expect(new Set(facts.vectorFontFaces).size).toBe(facts.vectorFontFaces!.length);
 }
});
