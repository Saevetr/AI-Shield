import { useEffect, useState } from 'react';
import { useColorapp as useRNColorapp } from 'react-native';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorapp() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorapp = useRNColorapp();

  if (hasHydrated) {
    return colorapp;
  }

  return 'light';
}

