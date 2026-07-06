"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { getUserProfile, subscribeAuth } from "./auth";
import type { UserProfile } from "./types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    return subscribeAuth((nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setIsLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    void getUserProfile(user.uid)
      .then((nextProfile) => {
        if (!cancelled) {
          setProfile(nextProfile);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfile(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { user, profile, isLoading, isAuthenticated: !!user };
}
