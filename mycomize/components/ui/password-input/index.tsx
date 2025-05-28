import { useState } from 'react';
import { Input, InputField, InputSlot, InputIcon } from '@/components/ui/input';
import { EyeIcon, EyeOffIcon } from 'lucide-react-native';

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  isInvalid?: boolean;
  className?: string;
}

export function PasswordInput({
  value,
  onChangeText,
  placeholder = 'Enter password',
  autoFocus = false,
  onFocus,
  isInvalid = false,
  className = '',
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <Input className={`text-center ${className}`} isInvalid={isInvalid}>
      <InputField
        type={showPassword ? 'text' : 'password'}
        autoCapitalize="none"
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
        onFocus={onFocus}
      />
      <InputSlot className="pr-3" onPress={handleTogglePassword}>
        <InputIcon as={showPassword ? EyeIcon : EyeOffIcon} size="lg" />
      </InputSlot>
    </Input>
  );
}
