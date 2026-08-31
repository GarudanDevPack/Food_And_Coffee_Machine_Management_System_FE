"use client";
import type { Options as ChoiceOption } from "choices.js";
import {
  type HTMLAttributes,
  type ReactElement,
  useEffect,
  useRef,
} from "react";

export type ChoiceProps = HTMLAttributes<HTMLInputElement> &
  HTMLAttributes<HTMLSelectElement> & {
    multiple?: boolean;
    className?: string;
    options?: Partial<ChoiceOption>;
    onChange?: (text: string) => void;
  } & (
    | {
        allowInput?: false;
        children: ReactElement[];
      }
    | { allowInput?: true }
  );

const ChoicesFormInput = ({
  children,
  multiple,
  className,
  onChange,
  allowInput,
  options,
  ...props
}: ChoiceProps) => {
  const choicesRef = useRef<HTMLInputElement & HTMLSelectElement>(null);

  useEffect(() => {
    if (!choicesRef.current) return;
    let choices: InstanceType<typeof import("choices.js").default> | undefined;
    let cancelled = false;

    import("choices.js").then(({ default: Choices }) => {
      if (cancelled || !choicesRef.current) return;
      choices = new Choices(choicesRef.current, {
        ...options,
        placeholder: true,
        allowHTML: true,
        shouldSort: false,
      });
      choices.passedElement.element.addEventListener("change", (e: Event) => {
        if (!(e.target instanceof HTMLSelectElement)) return;
        if (onChange) {
          onChange(e.target.value);
        }
      });
    });

    return () => {
      cancelled = true;
      choices?.destroy();
    };
  }, [choicesRef]);

  return allowInput ? (
    <input
      ref={choicesRef}
      multiple={multiple}
      className={className}
      {...props}
    />
  ) : (
    <select
      ref={choicesRef}
      multiple={multiple}
      className={className}
      {...props}
    >
      {children}
    </select>
  );
};

export default ChoicesFormInput;
