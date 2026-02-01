/**
 * Unit-тесты для lib/utils.ts
 */

import { describe, it, expect } from "@jest/globals";
import { cn } from "~/lib/utils";

describe("cn (classNames utility)", () => {
  it("должен объединять классы", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("должен обрабатывать условные классы", () => {
    expect(cn("base", true && "active", false && "hidden")).toBe("base active");
  });

  it("должен обрабатывать undefined и null", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("должен объединять tailwind классы с merge", () => {
    // twMerge должен объединять конфликтующие классы
    expect(cn("px-4", "px-8")).toBe("px-8");
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  it("должен обрабатывать массивы классов", () => {
    expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz");
  });

  it("должен обрабатывать объекты классов", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  it("должен возвращать пустую строку для пустого ввода", () => {
    expect(cn()).toBe("");
    expect(cn(undefined)).toBe("");
    expect(cn(null)).toBe("");
    expect(cn(false)).toBe("");
  });

  it("должен корректно обрабатывать сложные комбинации tailwind", () => {
    // Конфликтующие утилиты
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
    expect(cn("m-2", "m-4")).toBe("m-4");
    expect(cn("p-2 px-4", "p-4")).toBe("p-4");
  });

  it("должен сохранять неконфликтующие классы", () => {
    expect(cn("text-red-500", "bg-blue-500")).toBe("text-red-500 bg-blue-500");
    expect(cn("flex", "items-center", "justify-between")).toBe(
      "flex items-center justify-between"
    );
  });
});
