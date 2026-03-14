// Pakai 'val' buat ngasih tau Gradle kalau kita mau konfigurasi task yang ada
val jacocoTestReport by tasks.getting(JacocoReport::class) {
    dependsOn(tasks.test)
    reports {
        xml.required.set(true)
        csv.required.set(false)
        html.required.set(true)
    }
}

tasks.test {
    finalizedBy(jacocoTestReport)
}

plugins {
    java
    jacoco
    id("org.springframework.boot") version "3.5.11"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "GebxBy"
version = "0.0.1-SNAPSHOT"
description = "GebxByBlog"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    compileOnly("org.projectlombok:lombok")
    implementation("org.springframework.boot:spring-boot-starter-thymeleaf")
    developmentOnly("org.springframework.boot:spring-boot-devtools")
    annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")
    annotationProcessor("org.projectlombok:lombok")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
    implementation("org.apache.poi:poi-ooxml:5.2.5")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-client")
    implementation("org.springframework.boot:spring-boot-starter-data-mongodb")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
tasks.jacocoTestReport {
    dependsOn(tasks.test) // Laporan baru dibuat setelah test kelar
    reports {
        xml.required.set(true)
        csv.required.set(false)
        html.required.set(true) // Ini buat lu liat hasilnya di browser
    }
}

tasks.test {
    finalizedBy(tasks.jacocoTestReport) // Otomatis jalanin report tiap abis ./gradlew test
}