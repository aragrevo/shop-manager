import { forwardRef } from "react";
import { Input, type InputProps } from "./Input";

export type DatePickerProps = Omit<InputProps, "type">;

/**
 * Native date input wrapped with our label/error handling.
 * Value/onChange use the ISO "yyyy-MM-dd" string form.
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  function DatePicker(props, ref) {
    return <Input ref={ref} type="date" {...props} />;
  },
);
