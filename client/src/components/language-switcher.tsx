import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'cy', label: 'Cymraeg' },
  { code: 'es', label: 'Español' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <Select
      value={i18n.language}
      onValueChange={(value) => i18n.changeLanguage(value)}
    >
      <SelectTrigger data-testid="select-language">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code} data-testid={`select-language-${lang.code}`}>
            {lang.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
