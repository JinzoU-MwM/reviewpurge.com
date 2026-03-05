"use client";

type Props = {
  formId: string;
};

function setChecked(formId: string, checked: boolean) {
  const selector = `input[type="checkbox"][name="ids"][form="${formId}"]`;
  const elements = document.querySelectorAll<HTMLInputElement>(selector);
  elements.forEach((element) => {
    element.checked = checked;
  });
}

export function BulkSelectControls({ formId }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setChecked(formId, true)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
      >
        Select All On Page
      </button>
      <button
        type="button"
        onClick={() => setChecked(formId, false)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
      >
        Clear
      </button>
    </div>
  );
}
