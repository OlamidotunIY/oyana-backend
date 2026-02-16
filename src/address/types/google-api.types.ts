export type GoogleAutocompletePrediction = {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

export type GoogleAutocompleteResponse = {
  status: string;
  predictions?: GoogleAutocompletePrediction[];
  error_message?: string;
};

export type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

export type GoogleGeocodeResult = {
  formatted_address: string;
  place_id?: string;
  address_components?: GoogleAddressComponent[];
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
};

export type GoogleGeocodeResponse = {
  status: string;
  results?: GoogleGeocodeResult[];
  error_message?: string;
};
