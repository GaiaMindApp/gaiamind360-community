export interface PasswordStrength {
  score: number; // 0-4
  feedback: string;
  valid: boolean;
}

export function checkPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const feedback = score < 3 ? 'Fraca' : score === 3 ? 'Média' : 'Forte';
  return { score, feedback, valid: score >= 3 };
}
