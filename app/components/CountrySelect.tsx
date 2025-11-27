'use client';

import { Select, SelectItem } from "@heroui/react";
import { useEffect, useState } from "react";

interface Country {
  code: string;
  name: string;
}

interface CountrySelectProps {
  value: { label: string; value: string };
  onChange: (option: { label: string; value: string }) => void;
}

export function CountrySelect({ value, onChange }: CountrySelectProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('/api/countries');
        if (response.ok) {
          const data = await response.json();
          setCountries(data);
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCountries();
  }, []);

  return (
    <Select
      label="Country"
      selectedKeys={[value.value]}
      isLoading={loading}
      onChange={(e) => {
        const countryCode = e.target.value;
        const country = countries.find((c) => c.code === countryCode);
        if (country) {
          onChange({ label: country.name, value: country.code });
        }
      }}
    >
      {countries.map((country) => (
        <SelectItem key={country.code}>
          {country.name}
        </SelectItem>
      ))}
    </Select>
  );
} 