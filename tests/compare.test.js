import { compareGuess } from "../lib/compare.js";

const A = {
  name: "Boise State",
  state: "Idaho",
  city: "Boise",
  colors: ["blue", "orange"],
  mascot: "Broncos",
  stadium_capacity: 36363,
  previous_conference: "Mountain West"
};

test("exact match -> win", () => {
  const res = compareGuess({ ...A }, { ...A });
  expect(res.overall).toBe("win");
});

test("color overlap -> yellow", () => {
  const guess = { ...A, colors: ["blue", "red"] };
  const res = compareGuess(guess, A);
  expect(res.colors).toBe("yellow");
  expect(res.overall).toBe("continue");
});

test("stadium within 10% -> yellow", () => {
  const guess = { ...A, stadium_capacity: 33000 };
  const res = compareGuess(guess, A);
  expect(res.stadium_capacity).toBe("yellow");
});
