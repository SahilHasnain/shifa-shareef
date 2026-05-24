import React from "react";

export default function PrivacyPolicy() {
  return (
    <div
      style={{
        minHeight: "100vh",
        height: "100%",
        overflowY: "auto",
        backgroundColor: "#ffffff",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "48px 24px",
        }}
      >
        <h1
          style={{
            fontSize: "36px",
            fontWeight: "bold",
            color: "#111827",
            marginBottom: "16px",
          }}
        >
          Privacy Policy
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#6B7280",
            marginBottom: "32px",
          }}
        >
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          <section>
            <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
              1. Introduction
            </h2>
            <p style={{ fontSize: "16px", color: "#374151", lineHeight: "1.75" }}>
              Welcome to Shifa Shareef. We respect your privacy and are committed to protecting your
              personal data. This privacy policy explains how we handle your information when you
              use our mobile application.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
              2. Information We Collect
            </h2>
            <p style={{ fontSize: "16px", color: "#374151", lineHeight: "1.75", marginBottom: "8px" }}>
              Shifa Shareef is designed with privacy in mind. We collect minimal information:
            </p>
            <ul style={{ marginLeft: "24px", fontSize: "16px", color: "#374151", lineHeight: "1.75" }}>
              <li>Reading progress and session state stored locally on your device</li>
              <li>Bookmarks, theme preferences, and offline download data stored locally</li>
              <li>App preferences required to preserve your reading experience</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
              3. How We Use Your Information
            </h2>
            <p style={{ fontSize: "16px", color: "#374151", lineHeight: "1.75", marginBottom: "8px" }}>
              We use this information to:
            </p>
            <ul style={{ marginLeft: "24px", fontSize: "16px", color: "#374151", lineHeight: "1.75" }}>
              <li>Remember your reading position and bookmarks</li>
              <li>Support offline reading and downloaded page access</li>
              <li>Maintain theme and reader preferences across sessions</li>
              <li>Improve app stability and reading continuity</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
              4. Data Storage
            </h2>
            <p style={{ fontSize: "16px", color: "#374151", lineHeight: "1.75" }}>
              Your reading progress, bookmarks, downloaded pages, and preferences are stored locally
              on your device. We do not require account creation and do not store your personal
              reading data on our servers.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
              5. Third-Party Services
            </h2>
            <p style={{ fontSize: "16px", color: "#374151", lineHeight: "1.75" }}>
              Shifa Shareef may retrieve published reading assets from external delivery services to
              load book pages and metadata. These services may process technical request data needed
              to deliver content to your device.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
              6. Children&apos;s Privacy
            </h2>
            <p style={{ fontSize: "16px", color: "#374151", lineHeight: "1.75" }}>
              Our app is suitable for all ages. We do not knowingly collect personal information from
              children. The app does not require registration or account creation.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
              7. Your Rights
            </h2>
            <p style={{ fontSize: "16px", color: "#374151", lineHeight: "1.75", marginBottom: "8px" }}>
              You can:
            </p>
            <ul style={{ marginLeft: "24px", fontSize: "16px", color: "#374151", lineHeight: "1.75" }}>
              <li>Clear your reading data from inside the app</li>
              <li>Delete local data by uninstalling the app or clearing app storage</li>
              <li>Stop using the app at any time</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
              8. Changes to This Policy
            </h2>
            <p style={{ fontSize: "16px", color: "#374151", lineHeight: "1.75" }}>
              We may update this privacy policy from time to time. Any updates will be reflected on
              this page along with the latest update date.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
              9. Contact Us
            </h2>
            <p style={{ fontSize: "16px", color: "#374151", lineHeight: "1.75" }}>
              If you have any questions about this privacy policy, please contact us at:
            </p>
            <p style={{ fontSize: "16px", color: "#374151", lineHeight: "1.75", marginTop: "8px" }}>
              Email:{" "}
              <a
                href="mailto:mdsahil1631@gmail.com"
                style={{ color: "#10b981", textDecoration: "none" }}
              >
                mdsahil1631@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div
          style={{
            marginTop: "48px",
            paddingTop: "24px",
            borderTop: "1px solid #E5E7EB",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "14px", color: "#6B7280" }}>
            © {new Date().getFullYear()} Shifa Shareef. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
