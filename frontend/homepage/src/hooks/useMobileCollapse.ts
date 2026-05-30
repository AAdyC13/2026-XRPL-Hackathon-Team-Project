import { useEffect } from "react";

const MOBILE_MQ = "(max-width: 768px)";

function setExpanded(root: Element, trigger: Element, expanded: boolean) {
  root.classList.toggle("is-expanded", expanded);
  trigger.setAttribute("aria-expanded", String(expanded));
  const label = trigger.querySelector(".mobile-collapse-toggle-label");
  if (label) {
    label.textContent = expanded ? "收合詳情" : "展開詳情";
  }
}

function collapseAll() {
  document.querySelectorAll(".mobile-collapsible.is-expanded").forEach((root) => {
    const trigger = root.querySelector<HTMLElement>(
      ".mobile-collapse-toggle, .mobile-collapsible-trigger",
    );
    if (trigger) setExpanded(root, trigger, false);
  });
}

export function useMobileCollapse() {
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);

    const onTriggerClick = (event: Event) => {
      if (!mq.matches) return;
      const trigger = event.currentTarget as HTMLElement;
      const root = trigger.closest(".mobile-collapsible");
      if (!root) return;
      const expanded = !root.classList.contains("is-expanded");
      setExpanded(root, trigger, expanded);
    };

    const triggers = document.querySelectorAll<HTMLElement>(
      ".mobile-collapse-toggle, .mobile-collapsible-trigger",
    );

    triggers.forEach((trigger) => {
      trigger.addEventListener("click", onTriggerClick);
    });

    const onMqChange = () => {
      if (!mq.matches) collapseAll();
    };
    mq.addEventListener("change", onMqChange);

    return () => {
      triggers.forEach((trigger) => {
        trigger.removeEventListener("click", onTriggerClick);
      });
      mq.removeEventListener("change", onMqChange);
    };
  }, []);
}
