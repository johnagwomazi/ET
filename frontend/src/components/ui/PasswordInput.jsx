import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Input from "./Input";
import Button from "./Button";

function PasswordInput({ error, helperText, label = "Password", ...props }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="space-y-2">
      <Input
        {...props}
        type={isVisible ? "text" : "password"}
        label={label}
        error={error}
        helperText={helperText}
      />
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsVisible((value) => !value)}>
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span>{isVisible ? "Hide" : "Show"}</span>
        </Button>
      </div>
    </div>
  );
}

export default PasswordInput;
