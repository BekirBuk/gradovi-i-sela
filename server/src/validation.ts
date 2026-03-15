import * as fs from 'fs';
import * as path from 'path';

export type Category = 'countries' | 'cities' | 'rivers' | 'mountains' | 'animals' | 'plants' | 'names';
export type Language = 'en' | 'bs';

export const CATEGORIES: Category[] = ['countries', 'cities', 'rivers', 'mountains', 'animals', 'plants', 'names'];

const CATEGORY_LABELS: Record<Language, Record<Category, string>> = {
  en: {
    countries: 'Country',
    cities: 'City',
    rivers: 'River',
    mountains: 'Mountain',
    animals: 'Animal',
    plants: 'Plant',
    names: 'Name',
  },
  bs: {
    countries: 'Država',
    cities: 'Grad',
    rivers: 'Rijeka',
    mountains: 'Planina',
    animals: 'Životinja',
    plants: 'Biljka',
    names: 'Ime',
  },
};

export function getCategoryLabels(lang: Language): Record<Category, string> {
  return CATEGORY_LABELS[lang];
}

// Diacritics normalization for comparison
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Handle special Bosnian characters that NFD doesn't fully decompose
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

// Word lists loaded into memory
const wordLists: Record<Language, Record<Category, Set<string>>> = {
  en: {} as Record<Category, Set<string>>,
  bs: {} as Record<Category, Set<string>>,
};

// Normalized versions for comparison
const normalizedWordLists: Record<Language, Record<Category, Set<string>>> = {
  en: {} as Record<Category, Set<string>>,
  bs: {} as Record<Category, Set<string>>,
};

export function loadWordLists(): void {
  const languages: Language[] = ['en', 'bs'];
  for (const lang of languages) {
    for (const cat of CATEGORIES) {
      const filePath = path.join(__dirname, 'data', lang, `${cat}.json`);
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const words: string[] = JSON.parse(raw);
        wordLists[lang][cat] = new Set(words.map(w => w.toLowerCase()));
        normalizedWordLists[lang][cat] = new Set(words.map(w => normalize(w)));
      } catch (e) {
        console.warn(`Warning: Could not load ${filePath}`);
        wordLists[lang][cat] = new Set();
        normalizedWordLists[lang][cat] = new Set();
      }
    }
  }
  console.log('Word lists loaded.');
}

export function validateAnswer(answer: string, category: Category, letter: string, lang: Language): boolean {
  if (!answer || answer.trim() === '') return false;
  const normalizedAnswer = normalize(answer);
  const normalizedLetter = normalize(letter);
  // Must start with the correct letter
  if (!normalizedAnswer.startsWith(normalizedLetter)) return false;
  // Must exist in word list
  return normalizedWordLists[lang][category].has(normalizedAnswer);
}

// Get letters that have at least some valid answers across categories
export function getValidLetters(lang: Language): string[] {
  const allLetters = lang === 'bs'
    ? 'abcdefghijklmnoprsštuvz'.split('')
    : 'abcdefghijklmnoprstuv'.split('');

  return allLetters.filter(letter => {
    const normalizedLetter = normalize(letter);
    let categoriesWithAnswers = 0;
    for (const cat of CATEGORIES) {
      for (const word of normalizedWordLists[lang][cat]) {
        if (word.startsWith(normalizedLetter)) {
          categoriesWithAnswers++;
          break;
        }
      }
    }
    // Letter is valid if at least 4 categories have answers
    return categoriesWithAnswers >= 4;
  });
}
