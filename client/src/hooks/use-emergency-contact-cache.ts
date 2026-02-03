import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import type { Contact } from "@shared/schema";

const CACHED_CONTACT_KEY = "aok_emergency_contact";

export interface CachedEmergencyContact {
  name: string;
  phone: string;
}

export function useEmergencyContactCache() {
  const { user } = useAuth();

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const primaryContact = contacts?.find((c) => c.isPrimary && c.confirmedAt && c.phone);

  useEffect(() => {
    if (primaryContact?.phone) {
      const contactData: CachedEmergencyContact = {
        name: primaryContact.name,
        phone: primaryContact.phone,
      };
      localStorage.setItem(CACHED_CONTACT_KEY, JSON.stringify(contactData));
    }
  }, [primaryContact]);

  return primaryContact;
}

export function getCachedEmergencyContact(): CachedEmergencyContact | null {
  try {
    const cached = localStorage.getItem(CACHED_CONTACT_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}
