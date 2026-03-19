/**
 * Google Analytics Configuration
 *
 * IMPORTANT: Replace with your actual Measurement ID!
 * Get it from: Google Analytics → Admin → Property → Data Streams
 */

export const GA_CONFIG = {
    // Your Google Analytics 4 Measurement ID
    // Format: G-XXXXXXXXXX
    MEASUREMENT_ID: 'G-VZ3J109ZYJ', // ✅ Configured for Mystická Hvězda

    // Custom dimensions you want to track
    CUSTOM_DIMENSIONS: {
        plan_tier: 'custom_plan_tier', // free, pruvodce, osviceni, vesmirny_pruvodce
        feature_type: 'custom_feature_type', // divination, astrology, analysis
        user_tier: 'custom_user_tier' // free, premium, vip
    },

    // Events to track (can disable some if not needed)
    TRACK_EVENTS: {
        upgrade_modal: true,
        feature_usage: true,
        purchase: true,
        page_load_metrics: true,
        user_auth: true,
        performance: true
    },

    // Sampling (for high-traffic sites, track only X% of traffic)
    // 100 = track 100% (default), 50 = track 50%, etc.
    SAMPLE_RATE: 100,

    // Enable debug mode (logs all events to console)
    DEBUG: false // Set to true during development

};

// Validate configuration
export function validateGAConfig() {
    const { MEASUREMENT_ID } = GA_CONFIG;

    if (!MEASUREMENT_ID || MEASUREMENT_ID === 'G-XXXXXXXXXX') {
        console.error(
            '[GA] CONFIGURATION ERROR: Measurement ID not set!\n' +
            'Please update js/ga-config.js with your actual Measurement ID.\n' +
            'Get it from: Google Analytics → Admin → Property → Data Streams'
        );
        return false;
    }

    return true;
}

export default GA_CONFIG;
