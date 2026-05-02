export function getRuntimeEnvironmentName() {
    return process.env.RAILWAY_ENVIRONMENT_NAME ||
        process.env.RAILWAY_ENVIRONMENT ||
        process.env.VERCEL_ENV ||
        process.env.NODE_ENV ||
        'development';
}

export function isTestRuntime() {
    return process.env.NODE_ENV === 'test';
}

export function isProductionRuntime() {
    const runtimeEnvironment = String(getRuntimeEnvironmentName()).toLowerCase();
    return process.env.NODE_ENV === 'production' || runtimeEnvironment === 'production';
}

export function isDevelopmentRuntime() {
    return !isProductionRuntime() && !isTestRuntime();
}
