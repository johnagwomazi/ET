function trimValue(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function isValidEmail(value) {
  if (!value) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUrl(value) {
  if (!value) {
    return true;
  }

  try {
    // URL is enough here because backend validation is authoritative.
    // We only want to catch obvious mistakes client-side.
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeOptionalUrl(value) {
  const trimmed = trimValue(value);

  return trimmed;
}

function normalizeOptionalText(value) {
  return trimValue(value);
}

export function buildOrganizationProfileForm(organization = null) {
  return {
    organizationName: organization?.organizationName || "",
    businessEmail: organization?.businessEmail || "",
    businessPhone: organization?.businessPhone || "",
    website: organization?.website || "",
    address: organization?.address || "",
  };
}

export function buildOrganizationSettingsForm(organization = null) {
  const socialLinks = organization?.socialLinks || {};

  return {
    website: socialLinks.website || "",
    facebook: socialLinks.facebook || "",
    instagram: socialLinks.instagram || "",
    x: socialLinks.x || "",
    linkedin: socialLinks.linkedin || "",
  };
}

export function validateOrganizationProfileForm(values = {}) {
  const errors = {};
  const organizationName = trimValue(values.organizationName);
  const businessEmail = trimValue(values.businessEmail);
  const businessPhone = trimValue(values.businessPhone);
  const website = trimValue(values.website);
  const address = trimValue(values.address);

  if (!organizationName) {
    errors.organizationName = "Organization name is required";
  } else if (organizationName.length > 120) {
    errors.organizationName = "Organization name must be 120 characters or less";
  }

  if (!businessEmail) {
    errors.businessEmail = "Business email is required";
  } else if (!isValidEmail(businessEmail)) {
    errors.businessEmail = "Please provide a valid email address";
  }

  if (!businessPhone) {
    errors.businessPhone = "Business phone is required";
  } else if (businessPhone.length > 30) {
    errors.businessPhone = "Business phone must be 30 characters or less";
  }

  if (website && !isValidUrl(website)) {
    errors.website = "Please provide a valid URL";
  }

  if (address.length > 255) {
    errors.address = "Address must be 255 characters or less";
  }

  return errors;
}

export function validateOrganizationSettingsForm(values = {}) {
  const errors = {};
  const socialLinks = values || {};

  ["website", "facebook", "instagram", "x", "linkedin"].forEach((key) => {
    const value = trimValue(socialLinks[key]);

    if (value && !isValidUrl(value)) {
      errors[key] = "Please provide a valid URL";
    }
  });

  return errors;
}

export function buildOrganizationProfilePayload(values = {}) {
  const payload = {
    organizationName: normalizeOptionalText(values.organizationName),
    businessEmail: normalizeOptionalText(values.businessEmail).toLowerCase(),
    businessPhone: normalizeOptionalText(values.businessPhone),
    website: normalizeOptionalUrl(values.website),
  };

  const address = normalizeOptionalText(values.address);

  if (address) {
    payload.address = address;
  }

  return payload;
}

export function buildOrganizationSettingsPayload(values = {}) {
  return {
    socialLinks: {
      website: normalizeOptionalUrl(values.website),
      facebook: normalizeOptionalUrl(values.facebook),
      instagram: normalizeOptionalUrl(values.instagram),
      x: normalizeOptionalUrl(values.x),
      linkedin: normalizeOptionalUrl(values.linkedin),
    },
  };
}

