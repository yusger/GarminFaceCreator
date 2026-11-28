import { project, layer } from "../../src/domain";
export function roleFixture() {
  const p = project("Roles", true);
  p.layers = [
    {
      ...layer("text"),
      id: "title-a",
      name: "Title A",
      text: "HELLO",
      x: 110,
      y: 120,
      w: 230,
      h: 40,
      size: 28,
    },
    {
      ...layer("text"),
      id: "title-b",
      name: "Title B",
      text: "100",
      x: 120,
      y: 230,
      w: 210,
      h: 70,
      size: 54,
    },
  ];
  return p;
}
