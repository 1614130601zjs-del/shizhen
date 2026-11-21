plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "com.shizhen.vault"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.shizhen.vault"
        minSdk = 26
        targetSdk = 35
        versionCode = 3
        versionName = "0.3.0"
    }
}
dependencies { implementation("androidx.documentfile:documentfile:1.0.1") }
