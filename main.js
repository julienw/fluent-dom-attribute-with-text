import { FluentBundle, FluentResource } from "@fluent/bundle";
import { DOMLocalization } from "@fluent/dom";

const data = JSON.stringify(
  {
    name: "example",
    values: [1, 2, 3],
    nested: { key: "value" },
  },
  null,
  2
);

async function* generateBundles(locales) {
  const response = await fetch("locales/en/main.ftl");
  const text = await response.text();
  const bundle = new FluentBundle("en-US");
  const errors = bundle.addResource(new FluentResource(text));
  if (errors.length) {
    console.error("FTL parse errors:", errors);
  }
  yield bundle;
}

const l10n = new DOMLocalization(["locales/en/main.ftl"], generateBundles);
l10n.connectRoot(document.documentElement);

// Set the variable containing newlines via l10n-args
const box = document.querySelector("[data-l10n-id='box']");
l10n.setAttributes(box, "box", { data });
box.addEventListener("mouseover", () => console.log("title attr:", box.title));
