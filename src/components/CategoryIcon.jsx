import React from "react";
import {
  Route as Road, Circle, Trash2, Lightbulb, Droplets, Waves, Car, Building2, Leaf, HelpCircle
} from "lucide-react";

const CATEGORY_ICONS = {
  "Road Damage": Road,
  "Pothole": Circle,
  "Garbage": Trash2,
  "Streetlight": Lightbulb,
  "Water Leakage": Droplets,
  "Drainage": Waves,
  "Traffic": Car,
  "Public Infrastructure": Building2,
  "Environment": Leaf,
  "Other": HelpCircle,
};

const CATEGORY_COLORS = {
  "Road Damage": "text-orange-600 bg-orange-50",
  "Pothole": "text-amber-600 bg-amber-50",
  "Garbage": "text-green-600 bg-green-50",
  "Streetlight": "text-yellow-600 bg-yellow-50",
  "Water Leakage": "text-blue-600 bg-blue-50",
  "Drainage": "text-cyan-600 bg-cyan-50",
  "Traffic": "text-red-600 bg-red-50",
  "Public Infrastructure": "text-indigo-600 bg-indigo-50",
  "Environment": "text-emerald-600 bg-emerald-50",
  "Other": "text-slate-600 bg-slate-50",
};

export function CategoryIcon({ category, size = 18, className }) {
  const Icon = CATEGORY_ICONS[category] || HelpCircle;
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS["Other"];
  return (
    <span className={`inline-flex items-center justify-center rounded-lg p-1.5 ${color} ${className || ""}`}>
      <Icon size={size} />
    </span>
  );
}

export const CATEGORIES = Object.keys(CATEGORY_ICONS);