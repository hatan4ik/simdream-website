# Changelog

## [1.38.1](https://github.com/hatan4ik/simdream-website/compare/v1.38.0...v1.38.1) (2026-11-28)


### Bug Fixes

* **home:** repair the elements release 1.37.0 shipped visibly broken ([#376](https://github.com/hatan4ik/simdream-website/issues/376)) ([f01a719](https://github.com/hatan4ik/simdream-website/commit/f01a719914d7a8d0a781575c5d673708e300a6f7))

## [1.38.0](https://github.com/hatan4ik/simdream-website/compare/v1.37.0...v1.38.0) (2026-11-28)


### Features

* **home:** group the route gate into two sets led by Experiences and PRO ([#368](https://github.com/hatan4ik/simdream-website/issues/368)) ([4e0ee3d](https://github.com/hatan4ik/simdream-website/commit/4e0ee3d372a33ae9d133ae983a29a26da2a74943))

## [1.37.0](https://github.com/hatan4ik/simdream-website/compare/v1.36.1...v1.37.0) (2026-11-27)


### Features

* **home:** upgrade visual hierarchy and telemetry aesthetics with art direction ([#361](https://github.com/hatan4ik/simdream-website/issues/361)) ([2136265](https://github.com/hatan4ik/simdream-website/commit/2136265455535ac82162e46e5211f6148c163e67))

## [1.36.1](https://github.com/hatan4ik/simdream-website/compare/v1.36.0...v1.36.1) (2026-11-27)


### Bug Fixes

* **release:** attest the Verify run without GitHub's status list filter ([#362](https://github.com/hatan4ik/simdream-website/issues/362)) ([d290733](https://github.com/hatan4ik/simdream-website/commit/d29073360d136dcc52dcb252e82f7850256c1998))

## [1.36.0](https://github.com/hatan4ik/simdream-website/compare/v1.35.2...v1.36.0) (2026-11-27)


### Features

* **security:** add a self-closing diagnostic for the client address header ([#357](https://github.com/hatan4ik/simdream-website/issues/357)) ([70a8122](https://github.com/hatan4ik/simdream-website/commit/70a8122bf9ebf87867d6b3faed91ac8fd5d85511))


### Bug Fixes

* **security:** close the file-race code-scanning findings and record the triage ([#359](https://github.com/hatan4ik/simdream-website/issues/359)) ([89cf93b](https://github.com/hatan4ik/simdream-website/commit/89cf93b17fff74b8f334c408d939844044cdd9f0))

## [1.35.2](https://github.com/hatan4ik/simdream-website/compare/v1.35.1...v1.35.2) (2026-11-27)


### Performance Improvements

* **book:** server-render the first booking step instead of a placeholder ([#356](https://github.com/hatan4ik/simdream-website/issues/356)) ([ed1b0d4](https://github.com/hatan4ik/simdream-website/commit/ed1b0d4784a35fb4a13d53b3039cef92374990da))

## [1.35.1](https://github.com/hatan4ik/simdream-website/compare/v1.35.0...v1.35.1) (2026-11-27)


### Performance Improvements

* **bundle:** load the Supabase SDK in the browser on first use ([#351](https://github.com/hatan4ik/simdream-website/issues/351)) ([17dcab4](https://github.com/hatan4ik/simdream-website/commit/17dcab427482e34758b4e661e6d7484159917010))

## [1.35.0](https://github.com/hatan4ik/simdream-website/compare/v1.34.2...v1.35.0) (2026-11-27)


### Features

* **security:** throttle the two Wix checkout starts per client address ([#348](https://github.com/hatan4ik/simdream-website/issues/348)) ([5f38dce](https://github.com/hatan4ik/simdream-website/commit/5f38dce3bd897b147daa2a4e93dfedd7aabe49ec))


### Bug Fixes

* **security:** refuse a locked-out address even with the correct admin password ([#347](https://github.com/hatan4ik/simdream-website/issues/347)) ([7432a9c](https://github.com/hatan4ik/simdream-website/commit/7432a9cfcee58e1e0397fed82cc2033cf1471663))


### Performance Improvements

* **auth:** ask Supabase only for a token that can be a Supabase token ([#350](https://github.com/hatan4ik/simdream-website/issues/350)) ([5af2e04](https://github.com/hatan4ik/simdream-website/commit/5af2e04db887165d8762d62f0eaa523872e29c0e))
* **db:** read one day's bookings for per-day questions ([#345](https://github.com/hatan4ik/simdream-website/issues/345)) ([7202824](https://github.com/hatan4ik/simdream-website/commit/7202824b896b25619e9b397bd53fcc6dc3f16869))

## [1.34.2](https://github.com/hatan4ik/simdream-website/compare/v1.34.1...v1.34.2) (2026-11-26)


### Performance Improvements

* **reliability:** deadlines on idempotent reads, overlapped checkout and slot reads ([#341](https://github.com/hatan4ik/simdream-website/issues/341)) ([5da78dc](https://github.com/hatan4ik/simdream-website/commit/5da78dc7071650da8fa97eda14ec75d127dfcf9d))

## [1.34.1](https://github.com/hatan4ik/simdream-website/compare/v1.34.0...v1.34.1) (2026-11-26)


### Performance Improvements

* **i18n:** paint the server HTML at once unless a language hand-over needs hiding ([#339](https://github.com/hatan4ik/simdream-website/issues/339)) ([305a448](https://github.com/hatan4ik/simdream-website/commit/305a44828d2a0f20508b711ffd4a43979cef5f9c))

## [1.34.0](https://github.com/hatan4ik/simdream-website/compare/v1.33.0...v1.34.0) (2026-11-25)


### Features

* **checkout:** move birth date under contact fields, remove experience level, and display all scrollable Google reviews ([#337](https://github.com/hatan4ik/simdream-website/issues/337)) ([4481468](https://github.com/hatan4ik/simdream-website/commit/44814681180b9bd50f9a443063b718cec40fcdc4))
* **discounts:** implement Option A tiered birthday discounts ([#336](https://github.com/hatan4ik/simdream-website/issues/336)) ([9712515](https://github.com/hatan4ik/simdream-website/commit/97125151710c7860ff6b267a217f595004cd1501))

## [1.33.0](https://github.com/hatan4ik/simdream-website/compare/v1.32.6...v1.33.0) (2026-11-25)


### Features

* **home:** elevate route gate storytelling, visual hierarchy, and layout rhythm ([#334](https://github.com/hatan4ik/simdream-website/issues/334)) ([51a18c0](https://github.com/hatan4ik/simdream-website/commit/51a18c0f45dd872f649ae939d704fad84933ee4d))
* **home:** modularize homepage into 6-funnel intent route gate ([#333](https://github.com/hatan4ik/simdream-website/issues/333)) ([5c21da2](https://github.com/hatan4ik/simdream-website/commit/5c21da20bcf702823239a60d7b5c7e2d06c45184))

## [1.32.6](https://github.com/hatan4ik/simdream-website/compare/v1.32.5...v1.32.6) (2026-11-25)


### Bug Fixes

* **legal:** render the Hebrew rules and privacy text in the first HTML so no clause id is ever duplicated ([#329](https://github.com/hatan4ik/simdream-website/issues/329)) ([25d06f8](https://github.com/hatan4ik/simdream-website/commit/25d06f88418acc0f483f0d1e04bae55c08de02a6))

## [1.32.5](https://github.com/hatan4ik/simdream-website/compare/v1.32.4...v1.32.5) (2026-11-24)


### Bug Fixes

* **wix:** never fall back to local blog articles silently, verify a translated article after a publish, document it ([#326](https://github.com/hatan4ik/simdream-website/issues/326)) ([36eca72](https://github.com/hatan4ik/simdream-website/commit/36eca7212f17a507e5a3ec79718ecd1ea9cf250c))

## [1.32.4](https://github.com/hatan4ik/simdream-website/compare/v1.32.3...v1.32.4) (2026-11-24)


### Bug Fixes

* **wix:** query blog posts by slug with $eq so translated articles stop falling back to Hebrew ([#324](https://github.com/hatan4ik/simdream-website/issues/324)) ([1e778fc](https://github.com/hatan4ik/simdream-website/commit/1e778fc25951ce5e0978e322e39ff20432e94450))

## [1.32.3](https://github.com/hatan4ik/simdream-website/compare/v1.32.2...v1.32.3) (2026-11-24)


### Bug Fixes

* **blog:** stop the article page bouncing between translations on a language mismatch ([#322](https://github.com/hatan4ik/simdream-website/issues/322)) ([cb44986](https://github.com/hatan4ik/simdream-website/commit/cb44986388fbfee4cf4f61bb58877de4bc556c1b))
* **hooks:** judge the repository a commit targets, not the shell's start directory ([#321](https://github.com/hatan4ik/simdream-website/issues/321)) ([b8a4fe5](https://github.com/hatan4ik/simdream-website/commit/b8a4fe5a7d238b10e927c2ee838de471d7527d96))

## [1.32.2](https://github.com/hatan4ik/simdream-website/compare/v1.32.1...v1.32.2) (2026-11-24)


### Bug Fixes

* **deps:** override @node-minify/core glob to 14.0.6 to clear minimatch advisories ([#318](https://github.com/hatan4ik/simdream-website/issues/318)) ([ef73198](https://github.com/hatan4ik/simdream-website/commit/ef731987364ad86e49db17a21c15bc180f9534ca))

## [1.32.1](https://github.com/hatan4ik/simdream-website/compare/v1.32.0...v1.32.1) (2026-11-24)


### Bug Fixes

* **wix:** pin @opennextjs/cloudflare to 1.20.16 and guard the cookie bundle ([#310](https://github.com/hatan4ik/simdream-website/issues/310)) ([f014941](https://github.com/hatan4ik/simdream-website/commit/f014941875ed3afe7b75600a72e29bc6edad4148))

## [1.32.0](https://github.com/hatan4ik/simdream-website/compare/v1.31.2...v1.32.0) (2026-11-23)


### Features

* **wix:** add benefit pool duplicate guard, align documentation, and update slot study ([#306](https://github.com/hatan4ik/simdream-website/issues/306)) ([b88939b](https://github.com/hatan4ik/simdream-website/commit/b88939b4e16cc48c097a67f5114bc38789bbf77f))

## [1.31.2](https://github.com/hatan4ik/simdream-website/compare/v1.31.1...v1.31.2) (2026-11-23)


### Bug Fixes

* **reviews:** refresh Google rating to 5.0 (446 reviews) ([#301](https://github.com/hatan4ik/simdream-website/issues/301)) ([7f4dd72](https://github.com/hatan4ik/simdream-website/commit/7f4dd72a902bf260cb9392ef01df140035eafaa7))

## [1.31.1](https://github.com/hatan4ik/simdream-website/compare/v1.31.0...v1.31.1) (2026-11-19)


### Bug Fixes

* **booking:** sync audit drifts, judge upgraded 45m birthday in local checkout ([#284](https://github.com/hatan4ik/simdream-website/issues/284)) ([49ec23f](https://github.com/hatan4ik/simdream-website/commit/49ec23fe040997b3c1a5a1c2e2d11c5ad1f9d028))

## [1.31.0](https://github.com/hatan4ik/simdream-website/compare/v1.30.2...v1.31.0) (2026-11-18)


### Features

* **booking:** switch promo tier upgrades to upgraded duration grid (Option A) ([#279](https://github.com/hatan4ik/simdream-website/issues/279)) ([dfdedc8](https://github.com/hatan4ik/simdream-website/commit/dfdedc8726f9f62cff8ecfd29b4f57697e0428de))

## [1.30.2](https://github.com/hatan4ik/simdream-website/compare/v1.30.1...v1.30.2) (2026-11-18)


### Bug Fixes

* **booking:** judge the birthday discount on the upgraded tier, highlight the bare Discounted Promotion ([#281](https://github.com/hatan4ik/simdream-website/issues/281)) ([ca6cd14](https://github.com/hatan4ik/simdream-website/commit/ca6cd14922fde7a96dd6740084e667ca06d7321e))
* **wix:** PRO plan env keys and valid pricing-plan create payload ([#280](https://github.com/hatan4ik/simdream-website/issues/280)) ([1c51470](https://github.com/hatan4ik/simdream-website/commit/1c51470ab44b8c47fe428ccefbf232736bbb3031))

## [1.30.1](https://github.com/hatan4ik/simdream-website/compare/v1.30.0...v1.30.1) (2026-11-18)


### Bug Fixes

* **booking:** resolve promo-upgrade Wix 409s, Saturday pricing/grid parity, and closing-tail recovery ([#276](https://github.com/hatan4ik/simdream-website/issues/276)) ([bb01503](https://github.com/hatan4ik/simdream-website/commit/bb015038617d34dddac8a1303511973507cf2384))

## [1.30.0](https://github.com/hatan4ik/simdream-website/compare/v1.29.17...v1.30.0) (2026-11-18)


### Features

* **booking:** add smart promotional tier bump-up ladder, 120m ₪1,200 pack, flat ₪850 90m pricing, and friction-free 7-language copy ([#271](https://github.com/hatan4ik/simdream-website/issues/271)) ([b5154c1](https://github.com/hatan4ik/simdream-website/commit/b5154c11d17d60f375ecea5a069756a69b2994b6))

## [1.29.17](https://github.com/hatan4ik/simdream-website/compare/v1.29.16...v1.29.17) (2026-11-17)


### Bug Fixes

* **wix:** reserve add-on time in Wix and offer the next session 15 minutes after a booking ([#269](https://github.com/hatan4ik/simdream-website/issues/269)) ([9998590](https://github.com/hatan4ik/simdream-website/commit/9998590d5990ca73ea3cb35897781a626af6b190))

## [1.29.16](https://github.com/hatan4ik/simdream-website/compare/v1.29.15...v1.29.16) (2026-11-17)


### Bug Fixes

* **forms:** make browser autofill fill the voucher and refund forms, tidy inputs and viewport height ([#266](https://github.com/hatan4ik/simdream-website/issues/266)) ([e1221cb](https://github.com/hatan4ik/simdream-website/commit/e1221cbcce47089b45841b94eba593a517a05003))

## [1.29.15](https://github.com/hatan4ik/simdream-website/compare/v1.29.14...v1.29.15) (2026-11-17)


### Bug Fixes

* **theme:** follow the active theme for native UI and the Clean Studio scrollbar ([#262](https://github.com/hatan4ik/simdream-website/issues/262)) ([13e49ea](https://github.com/hatan4ik/simdream-website/commit/13e49ea595c0074397577f0d734ea221ffec4d09))

## [1.29.14](https://github.com/hatan4ik/simdream-website/compare/v1.29.13...v1.29.14) (2026-11-17)


### Bug Fixes

* **forms:** announce name, email and phone to browser autofill ([#261](https://github.com/hatan4ik/simdream-website/issues/261)) ([905efec](https://github.com/hatan4ik/simdream-website/commit/905efec06b60d0508940db0043ea5f87e1369516))

## [1.29.13](https://github.com/hatan4ik/simdream-website/compare/v1.29.12...v1.29.13) (2026-11-17)


### Bug Fixes

* **vouchers,booking:** validate 100-OFF (100% off services) and 15-OFF (15% off) with active status and discount details ([#258](https://github.com/hatan4ik/simdream-website/issues/258)) ([9d02c68](https://github.com/hatan4ik/simdream-website/commit/9d02c68dbd96b762149e5380a4f631142d9d5677))

## [1.29.12](https://github.com/hatan4ik/simdream-website/compare/v1.29.11...v1.29.12) (2026-11-17)


### Bug Fixes

* **booking,vouchers:** allow combining Wix Coupon and Gift Card + add /vouchers Gift Card & Coupon verification + staging suite ([#256](https://github.com/hatan4ik/simdream-website/issues/256)) ([23f4fc2](https://github.com/hatan4ik/simdream-website/commit/23f4fc2a2ea6bb85a5d29bb58b23f390b914444b))

## [1.29.11](https://github.com/hatan4ik/simdream-website/compare/v1.29.10...v1.29.11) (2026-11-17)


### Bug Fixes

* **ui:** modernize autofill, scrollbars, switch attribute, and toSorted patterns ([#254](https://github.com/hatan4ik/simdream-website/issues/254)) ([cc64fb4](https://github.com/hatan4ik/simdream-website/commit/cc64fb4a5ecdbd2078fd4ac46f08d6573fb5ff15))

## [1.29.10](https://github.com/hatan4ik/simdream-website/compare/v1.29.9...v1.29.10) (2026-11-16)


### Bug Fixes

* **booking:** keep Express Shop buy-box and consent controls clear of cookie banner ([#252](https://github.com/hatan4ik/simdream-website/issues/252)) ([eaf2ce2](https://github.com/hatan4ik/simdream-website/commit/eaf2ce2cc4b2eb5df4cec84a715817b442f1be9e))

## [1.29.9](https://github.com/hatan4ik/simdream-website/compare/v1.29.8...v1.29.9) (2026-11-16)


### Bug Fixes

* **booking:** harden multi-addon scroll clearance, slot reconciliation, es translations, and CI guard ([#250](https://github.com/hatan4ik/simdream-website/issues/250)) ([7a7d5cd](https://github.com/hatan4ik/simdream-website/commit/7a7d5cd6b30e760535948baffe262c1e6dc1f8c7))

## [1.29.8](https://github.com/hatan4ik/simdream-website/compare/v1.29.7...v1.29.8) (2026-11-16)


### Bug Fixes

* **booking,a11y:** keep focused and scrolled controls clear of sticky bars ([#245](https://github.com/hatan4ik/simdream-website/issues/245)) ([1d849fd](https://github.com/hatan4ik/simdream-website/commit/1d849fd9255b29517ee699a6bc301dcfc7829101))
* **booking,ci:** align chrome scroll offsets and eliminate release PR cancellation race ([#248](https://github.com/hatan4ik/simdream-website/issues/248)) ([989a0f5](https://github.com/hatan4ik/simdream-website/commit/989a0f581b3042ab892088ede2e6fefd01818bfc))

## [1.29.7](https://github.com/hatan4ik/simdream-website/compare/v1.29.6...v1.29.7) (2026-11-16)


### Bug Fixes

* **reviews:** refresh Google rating to 5.0 (433 reviews) ([#244](https://github.com/hatan4ik/simdream-website/issues/244)) ([8d2c08b](https://github.com/hatan4ik/simdream-website/commit/8d2c08b20cbad02bfadea3ec3dda1d6766570a0a))

## [1.29.6](https://github.com/hatan4ik/simdream-website/compare/v1.29.5...v1.29.6) (2026-11-16)


### Bug Fixes

* **wix,csp,auth:** allow edge.wixapis.com, recover stale session 403s, and keep error HTTP statuses ([#242](https://github.com/hatan4ik/simdream-website/issues/242)) ([ce9000d](https://github.com/hatan4ik/simdream-website/commit/ce9000d6874408119b49aab698f086fd83f5ed55))

## [1.29.5](https://github.com/hatan4ik/simdream-website/compare/v1.29.4...v1.29.5) (2026-11-16)


### Bug Fixes

* **wix,booking:** surface checkout API errors, validate email format, and avoid false birthday coupon alert ([#240](https://github.com/hatan4ik/simdream-website/issues/240)) ([d4a7790](https://github.com/hatan4ik/simdream-website/commit/d4a7790052c06aa35195df4a1ad26852a83b7f19))

## [1.29.4](https://github.com/hatan4ik/simdream-website/compare/v1.29.3...v1.29.4) (2026-11-15)


### Bug Fixes

* **security:** throttle checkout, bind Wix pricing and claims, and protect public forms ([#238](https://github.com/hatan4ik/simdream-website/issues/238)) ([e126fb5](https://github.com/hatan4ik/simdream-website/commit/e126fb593357f5acc2603f818dc89c1da743decf))

## [1.29.3](https://github.com/hatan4ik/simdream-website/compare/v1.29.2...v1.29.3) (2026-11-15)


### Bug Fixes

* **wix,booking,vouchers:** prefill customer info, birthDate, IL country, and inherit across pages ([#228](https://github.com/hatan4ik/simdream-website/issues/228)) ([50fa5d7](https://github.com/hatan4ik/simdream-website/commit/50fa5d714395f60a1b24c73c00f8e8fbb7162b52))

## [1.29.2](https://github.com/hatan4ik/simdream-website/compare/v1.29.1...v1.29.2) (2026-11-15)


### Bug Fixes

* **booking:** validate add-on duration in Wix checkout and surface real Cart V2 violations ([#226](https://github.com/hatan4ik/simdream-website/issues/226)) ([5bd19e5](https://github.com/hatan4ik/simdream-website/commit/5bd19e5e64c165f0016c3ba8817e35eda4d415a4))

## [1.29.1](https://github.com/hatan4ik/simdream-website/compare/v1.29.0...v1.29.1) (2026-11-15)


### Bug Fixes

* **booking:** price wix-pricing birthday preview on subtotalIls with Option B live ([#224](https://github.com/hatan4ik/simdream-website/issues/224)) ([a5f931c](https://github.com/hatan4ik/simdream-website/commit/a5f931cf055deb07bfbc9151b832a86e7e3058fe))

## [1.29.0](https://github.com/hatan4ik/simdream-website/compare/v1.28.6...v1.29.0) (2026-11-14)


### Features

* **theme:** orange primary buttons in the Cobalt and Squadron night tones ([#222](https://github.com/hatan4ik/simdream-website/issues/222)) ([57e28df](https://github.com/hatan4ik/simdream-website/commit/57e28dffba40e3536c4ee73fd3d687142ce81055))

## [1.28.6](https://github.com/hatan4ik/simdream-website/compare/v1.28.5...v1.28.6) (2026-11-14)


### Bug Fixes

* **booking:** price wix-pricing birthday preview on base package only ([#220](https://github.com/hatan4ik/simdream-website/issues/220)) ([cc7a84c](https://github.com/hatan4ik/simdream-website/commit/cc7a84c2dfbb0c3d7733a2f927f24bc9d7f696b1))

## [1.28.5](https://github.com/hatan4ik/simdream-website/compare/v1.28.4...v1.28.5) (2026-11-14)


### Bug Fixes

* **wix:** ignore pre-checkout MISSING_DELIVERY_METHOD violation for addon carts ([#218](https://github.com/hatan4ik/simdream-website/issues/218)) ([2e59b37](https://github.com/hatan4ik/simdream-website/commit/2e59b37295148660247745843acde4e9430e4af7))

## [1.28.4](https://github.com/hatan4ik/simdream-website/compare/v1.28.3...v1.28.4) (2026-11-14)


### Bug Fixes

* **wix:** omit formSubmission when birthdayPricingClaim is present so additionalFields reaches pricing SPI ([#215](https://github.com/hatan4ik/simdream-website/issues/215)) ([920446f](https://github.com/hatan4ik/simdream-website/commit/920446fb01bbc46b563f4e09736d822692aef462))

## [1.28.3](https://github.com/hatan4ik/simdream-website/compare/v1.28.2...v1.28.3) (2026-11-14)


### Bug Fixes

* **booking,wix:** add OrderSummary addon remove button and cap Wix slot maxAvailableMinutes ([#212](https://github.com/hatan4ik/simdream-website/issues/212)) ([1e0e587](https://github.com/hatan4ik/simdream-website/commit/1e0e58787aadedb0425fae493f65d0c4ea23c606))

## [1.28.2](https://github.com/hatan4ik/simdream-website/compare/v1.28.1...v1.28.2) (2026-11-14)


### Bug Fixes

* **wix:** surface Cart V2 error code and message on cart creation failure ([#210](https://github.com/hatan4ik/simdream-website/issues/210)) ([4a4e285](https://github.com/hatan4ik/simdream-website/commit/4a4e2857571f0c6ece6b9a242b66dd6fd5e79344))

## [1.28.1](https://github.com/hatan4ik/simdream-website/compare/v1.28.0...v1.28.1) (2026-11-14)


### Bug Fixes

* **wix:** support add-ons and route requests natively in Wix checkout ([#202](https://github.com/hatan4ik/simdream-website/issues/202)) ([fe4b4c7](https://github.com/hatan4ik/simdream-website/commit/fe4b4c79b2b2e838e0066a6a0a946600cd3eff18))

## [1.28.0](https://github.com/hatan4ik/simdream-website/compare/v1.27.0...v1.28.0) (2026-11-13)


### Features

* **ux:** add a branded, localized 404 page ([#200](https://github.com/hatan4ik/simdream-website/issues/200)) ([e7c5574](https://github.com/hatan4ik/simdream-website/commit/e7c55743765ac9f18799cfa929fd99e17f2b623f))

## [1.27.0](https://github.com/hatan4ik/simdream-website/compare/v1.26.0...v1.27.0) (2026-11-13)


### Features

* **loyalty:** generalize promotion claim contract and add 7-language checkout copy ([#198](https://github.com/hatan4ik/simdream-website/issues/198)) ([f2336e9](https://github.com/hatan4ik/simdream-website/commit/f2336e9bcc374b0e99b90b1948dda67b4eb1a78b))

## [1.26.0](https://github.com/hatan4ik/simdream-website/compare/v1.25.0...v1.26.0) (2026-11-13)


### Features

* **i18n,blog:** add full German (de) frontend & Wix Blog support ([#195](https://github.com/hatan4ik/simdream-website/issues/195)) ([5eddc07](https://github.com/hatan4ik/simdream-website/commit/5eddc07f068d72f8f045d0e2cb94f77f666a13b2))

## [1.25.0](https://github.com/hatan4ik/simdream-website/compare/v1.24.0...v1.25.0) (2026-11-13)


### Features

* **release:** add audited Wix deployment ledger ([#193](https://github.com/hatan4ik/simdream-website/issues/193)) ([e9d4dc8](https://github.com/hatan4ik/simdream-website/commit/e9d4dc8a821f4ec7c59727dfef4958496db5a105))

## [1.24.0](https://github.com/hatan4ik/simdream-website/compare/v1.23.0...v1.24.0) (2026-11-13)


### Features

* **wix:** add birthday pricing provider ([#191](https://github.com/hatan4ik/simdream-website/issues/191)) ([dc533fb](https://github.com/hatan4ik/simdream-website/commit/dc533fbd11d60ee0601babee7578f2c8cc920a33))

## [1.23.0](https://github.com/hatan4ik/simdream-website/compare/v1.22.1...v1.23.0) (2026-11-13)


### Features

* **i18n:** route Wix locales through public URLs ([#187](https://github.com/hatan4ik/simdream-website/issues/187)) ([8bf10b3](https://github.com/hatan4ik/simdream-website/commit/8bf10b329a42ea146ef81981ad8ea99ebf8cf916))

## [1.22.1](https://github.com/hatan4ik/simdream-website/compare/v1.22.0...v1.22.1) (2026-11-13)


### Bug Fixes

* **blog,i18n:** localize blog hero and honor Wix path locale prefix ([#188](https://github.com/hatan4ik/simdream-website/issues/188)) ([9e241e7](https://github.com/hatan4ik/simdream-website/commit/9e241e7bcd61dae3b9f2843a0630e21438d098aa))

## [1.22.0](https://github.com/hatan4ik/simdream-website/compare/v1.21.2...v1.22.0) (2026-11-13)


### Features

* **seo:** short canonical blog URLs, 6-lang metadata, 301 redirects, llms.txt & sitemap ([#183](https://github.com/hatan4ik/simdream-website/issues/183)) ([3881ede](https://github.com/hatan4ik/simdream-website/commit/3881edeaa5e857d22320537ea63e4fba634b2a3f))

## [1.21.2](https://github.com/hatan4ik/simdream-website/compare/v1.21.1...v1.21.2) (2026-11-13)


### Bug Fixes

* **reviews:** remove invalid route export MIN_REFRESH_TOKEN_LENGTH ([#184](https://github.com/hatan4ik/simdream-website/issues/184)) ([f1cfb1e](https://github.com/hatan4ik/simdream-website/commit/f1cfb1e3c8d64eeff9aebc1cc80f891209dacd67))

## [1.21.1](https://github.com/hatan4ik/simdream-website/compare/v1.21.0...v1.21.1) (2026-11-12)


### Bug Fixes

* **contact:** deliver Dispatch inquiries through server route ([#180](https://github.com/hatan4ik/simdream-website/issues/180)) ([3374bdd](https://github.com/hatan4ik/simdream-website/commit/3374bdd43819f73b87b182c7a6f97f2f57d8558f))
* **test:** scope the contact failure alert so the route announcer cannot match ([#181](https://github.com/hatan4ik/simdream-website/issues/181)) ([3982da5](https://github.com/hatan4ik/simdream-website/commit/3982da528559e658ebe605b7e021a24f30e4d13f))

## [1.21.0](https://github.com/hatan4ik/simdream-website/compare/v1.20.0...v1.21.0) (2026-11-12)


### Features

* checkout consent and birthday discount, refund form, offers page, cookie consent, modular booking and navbar ([#115](https://github.com/hatan4ik/simdream-website/issues/115)) ([26eb52a](https://github.com/hatan4ik/simdream-website/commit/26eb52a28c9484f05a656730b7a6c6007ca06741))

## [1.20.0](https://github.com/hatan4ik/simdream-website/compare/v1.19.1...v1.20.0) (2026-11-12)


### Features

* **training:** add Ground School cohort requests ([#114](https://github.com/hatan4ik/simdream-website/issues/114)) ([5ee217a](https://github.com/hatan4ik/simdream-website/commit/5ee217ac704ab3ee1ef32bd909941d7d14122b93))

## [1.19.1](https://github.com/hatan4ik/simdream-website/compare/v1.19.0...v1.19.1) (2026-11-12)


### Bug Fixes

* **theme:** light phone menu panel in Brand Daylight and Clean Studio ([#112](https://github.com/hatan4ik/simdream-website/issues/112)) ([588ffda](https://github.com/hatan4ik/simdream-website/commit/588ffdad0a3f9d35b096306e2e633414ae930486))

## [1.19.0](https://github.com/hatan4ik/simdream-website/compare/v1.18.0...v1.19.0) (2026-11-11)


### Features

* **theme,brand:** add navy Cockpit Night palettes and update horizontal brand logo ([#109](https://github.com/hatan4ik/simdream-website/issues/109)) ([5fe4e27](https://github.com/hatan4ik/simdream-website/commit/5fe4e27949bf0f2d45cf555d56e565999ecbf5b7))

## [1.18.0](https://github.com/hatan4ik/simdream-website/compare/v1.17.2...v1.18.0) (2026-11-11)


### Features

* **tracks:** consumer-only flight tracks, PRO tracks on /pro, PRO tier prices ([#108](https://github.com/hatan4ik/simdream-website/issues/108)) ([0ad929c](https://github.com/hatan4ik/simdream-website/commit/0ad929cfec42b87cfc1e4a520ff387a9cadae31b))

## [1.17.2](https://github.com/hatan4ik/simdream-website/compare/v1.17.1...v1.17.2) (2026-11-11)


### Bug Fixes

* **ux:** streamline subscription purchase, clarify world trios, and bridge pro airline prep ([#106](https://github.com/hatan4ik/simdream-website/issues/106)) ([0826822](https://github.com/hatan4ik/simdream-website/commit/08268229d9d7da3bffa33860cc4bf72034c04f6c))

## [1.17.1](https://github.com/hatan4ik/simdream-website/compare/v1.17.0...v1.17.1) (2026-11-11)


### Bug Fixes

* **header:** restore mobile navigation and compact WhatsApp ([#103](https://github.com/hatan4ik/simdream-website/issues/103)) ([f516fbb](https://github.com/hatan4ik/simdream-website/commit/f516fbbc1ae56251280feb9f4636336c5860e2c9))
* **i18n:** name the Russian flight-tracks menu item «Абонемент» ([#104](https://github.com/hatan4ik/simdream-website/issues/104)) ([4452565](https://github.com/hatan4ik/simdream-website/commit/4452565e8c76684cf7ab445ddef253f60186ec79))

## [1.17.0](https://github.com/hatan4ik/simdream-website/compare/v1.16.1...v1.17.0) (2026-11-11)


### Features

* **reviews:** translate the newest Google reviews with Cloud Translation ([#101](https://github.com/hatan4ik/simdream-website/issues/101)) ([c531e55](https://github.com/hatan4ik/simdream-website/commit/c531e55fe35cb5bc8059c5c7c365f91bc76e2a8c))

## [1.16.1](https://github.com/hatan4ik/simdream-website/compare/v1.16.0...v1.16.1) (2026-11-11)


### Bug Fixes

* **reviews:** send the page language as `language`, not Wix's reserved `lang` ([#99](https://github.com/hatan4ik/simdream-website/issues/99)) ([6cffcdf](https://github.com/hatan4ik/simdream-website/commit/6cffcdfcec6010ba484e74823f0813732d09c4bc))

## [1.16.0](https://github.com/hatan4ik/simdream-website/compare/v1.15.0...v1.16.0) (2026-11-10)


### Features

* **blog:** wire multilingual blog mapping, routing and language synchronization ([#97](https://github.com/hatan4ik/simdream-website/issues/97)) ([5a36f55](https://github.com/hatan4ik/simdream-website/commit/5a36f559ccee28b62dba1d1c524b8e4c871e66e6))

## [1.15.0](https://github.com/hatan4ik/simdream-website/compare/v1.14.1...v1.15.0) (2026-11-10)


### Features

* **blog:** complete multilingual translations and batch publisher engine ([#95](https://github.com/hatan4ik/simdream-website/issues/95)) ([dca545d](https://github.com/hatan4ik/simdream-website/commit/dca545de23ad40bd04d705482bf46e9ded18f8f7))

## [1.14.1](https://github.com/hatan4ik/simdream-website/compare/v1.14.0...v1.14.1) (2026-11-09)


### Bug Fixes

* **blog:** ensure language he on import and use 3-step publish in translate cli ([#93](https://github.com/hatan4ik/simdream-website/issues/93)) ([0027fa8](https://github.com/hatan4ik/simdream-website/commit/0027fa868fe22f5fa8e3e21cae44f34bf4de7bb8))

## [1.14.0](https://github.com/hatan4ik/simdream-website/compare/v1.13.1...v1.14.0) (2026-11-09)


### Features

* **blog:** add wix multilingual translation CLI for english and russian ([#91](https://github.com/hatan4ik/simdream-website/issues/91)) ([daefe85](https://github.com/hatan4ik/simdream-website/commit/daefe8513ef3c4d409354feaa3217132e7397b18))

## [1.13.1](https://github.com/hatan4ik/simdream-website/compare/v1.13.0...v1.13.1) (2026-11-09)


### Bug Fixes

* **reviews:** keep live newest-first reviews in the header when no snapshot store exists ([#88](https://github.com/hatan4ik/simdream-website/issues/88)) ([27ed239](https://github.com/hatan4ik/simdream-website/commit/27ed239ee3cb8b1b3b970dfe4fc15d2d67cbcf29))

## [1.13.0](https://github.com/hatan4ik/simdream-website/compare/v1.12.0...v1.13.0) (2026-11-09)


### Features

* **reviews:** header-only, newest-first Google reviews from a twice-daily snapshot ([#86](https://github.com/hatan4ik/simdream-website/issues/86)) ([e4a36e8](https://github.com/hatan4ik/simdream-website/commit/e4a36e8ac6a2978607e1772fef30d1c694e5a45a))
* **seo:** generate llms.txt from the registries, add blog Person author and breadcrumbs, test route coverage ([#84](https://github.com/hatan4ik/simdream-website/issues/84)) ([ddc85b0](https://github.com/hatan4ik/simdream-website/commit/ddc85b00cfca5a939113aaaf2aca6bdc7e29f34e))
* **subscriptions:** sell flight tracks by outcome, never by the 12-month term ([#82](https://github.com/hatan4ik/simdream-website/issues/82)) ([ec1e1a7](https://github.com/hatan4ik/simdream-website/commit/ec1e1a78398fd2041da8e3f6cd69b3410957805c))


### Bug Fixes

* **seo:** derive structured data from the registries; FAQPage only beside a visible FAQ ([#85](https://github.com/hatan4ik/simdream-website/issues/85)) ([fbe9f6e](https://github.com/hatan4ik/simdream-website/commit/fbe9f6e7f4515106b12c1f23f31a1abd31c968f1))

## [1.12.0](https://github.com/hatan4ik/simdream-website/compare/v1.11.0...v1.12.0) (2026-11-09)


### Features

* **wix-blog:** enhance migration script with batching and local CLI auth ([#81](https://github.com/hatan4ik/simdream-website/issues/81)) ([b15e06c](https://github.com/hatan4ik/simdream-website/commit/b15e06c985ca33d87b60348eac367468ab8a6fb4))

## [1.11.0](https://github.com/hatan4ik/simdream-website/compare/v1.10.1...v1.11.0) (2026-11-09)


### Features

* **blog:** integrate 39 Wix blog articles with 1:1 SEO routes, static pre-rendering, and conversion CTAs ([#76](https://github.com/hatan4ik/simdream-website/issues/76)) ([0b7621a](https://github.com/hatan4ik/simdream-website/commit/0b7621ae13d2433ed290cbd5280fe9b1075280df))


### Bug Fixes

* **wix:** keep the Worker under Wix's upload limit (UTF-8 output, single blog corpus, size budget) ([#79](https://github.com/hatan4ik/simdream-website/issues/79)) ([c5673b2](https://github.com/hatan4ik/simdream-website/commit/c5673b2ec95119fed780e1e0b7d486aeb0e5809b))

## [1.10.1](https://github.com/hatan4ik/simdream-website/compare/v1.10.0...v1.10.1) (2026-11-09)


### Bug Fixes

* **vouchers:** show the live preview after the amount choice on phones ([#74](https://github.com/hatan4ik/simdream-website/issues/74)) ([05144d4](https://github.com/hatan4ik/simdream-website/commit/05144d4697ddab98afe32db9daac4ae7898296e7))

## [1.10.0](https://github.com/hatan4ik/simdream-website/compare/v1.9.1...v1.10.0) (2026-11-09)


### Features

* **reviews:** newest first, publish date, author attribution and Google's translation with "show original" ([#72](https://github.com/hatan4ik/simdream-website/issues/72)) ([6f38e49](https://github.com/hatan4ik/simdream-website/commit/6f38e4953a5433cbb8231ef3426e3b6385027d43))

## [1.9.1](https://github.com/hatan4ik/simdream-website/compare/v1.9.0...v1.9.1) (2026-11-09)


### Bug Fixes

* **reviews:** refresh Google rating to 5.0 (424 reviews) ([#70](https://github.com/hatan4ik/simdream-website/issues/70)) ([88612dc](https://github.com/hatan4ik/simdream-website/commit/88612dc2b083f206a7f0aca7e8094e09d36c5965))

## [1.9.0](https://github.com/hatan4ik/simdream-website/compare/v1.8.0...v1.9.0) (2026-11-09)


### Features

* **vouchers:** sell gift cards and certificates only at fixed amounts, no custom sum ([#67](https://github.com/hatan4ik/simdream-website/issues/67)) ([c6a696c](https://github.com/hatan4ik/simdream-website/commit/c6a696c12a84793bb1998e53022b650969e3eecf))

## [1.8.0](https://github.com/hatan4ik/simdream-website/compare/v1.7.0...v1.8.0) (2026-11-09)


### Features

* **wix:** add Wix-as-Code backend blueprint and multi-lock protected provisioner ([#64](https://github.com/hatan4ik/simdream-website/issues/64)) ([8fd6516](https://github.com/hatan4ik/simdream-website/commit/8fd65161fc99f1b35fba3485c980805c53bddfaf))


### Bug Fixes

* **booking:** trust and recovery fixes from the source-based CX audit ([#65](https://github.com/hatan4ik/simdream-website/issues/65)) ([45c57e3](https://github.com/hatan4ik/simdream-website/commit/45c57e38024950bbda5df261189c5c8035d4ff5c))

## [1.7.0](https://github.com/hatan4ik/simdream-website/compare/v1.6.0...v1.7.0) (2026-11-08)


### Features

* **marketing:** emotion-first hero copy and a calm /fear-of-flying landing page ([#62](https://github.com/hatan4ik/simdream-website/issues/62)) ([2b1787c](https://github.com/hatan4ik/simdream-website/commit/2b1787c6a0e0c6156cdb4a76d7c1a18c57d6b7ed))

## [1.6.0](https://github.com/hatan4ik/simdream-website/compare/v1.5.0...v1.6.0) (2026-11-08)


### Features

* **booking:** dynamically switch checkout to Airline Interview Prep 60 PRO on ATPL selection ([#56](https://github.com/hatan4ik/simdream-website/issues/56)) ([39f4500](https://github.com/hatan4ik/simdream-website/commit/39f45001582cc1736eec44254a190e24afd3184f))
* **booking:** limit the calendar to one year ahead and add a Today button ([#55](https://github.com/hatan4ik/simdream-website/issues/55)) ([4bab45b](https://github.com/hatan4ik/simdream-website/commit/4bab45bd354297c95f55419fca2a55e5eb77745d))

## [1.5.0](https://github.com/hatan4ik/simdream-website/compare/v1.4.0...v1.5.0) (2026-11-08)


### Features

* **vouchers:** map 7 gift card designs to native Wix Gift Card variants and checkout ([#53](https://github.com/hatan4ik/simdream-website/issues/53)) ([9dd909b](https://github.com/hatan4ik/simdream-website/commit/9dd909bc4bf7d502a8e7c42cd1e7629ef8f9fa6f))

## [1.4.0](https://github.com/hatan4ik/simdream-website/compare/v1.3.0...v1.4.0) (2026-11-08)


### Features

* **vouchers:** link each Gift Card colour to one balance and lower the minimum to 50 ([#51](https://github.com/hatan4ik/simdream-website/issues/51)) ([65514c9](https://github.com/hatan4ik/simdream-website/commit/65514c98d713273e640488810f2c195c3dac560b))

## [1.3.0](https://github.com/hatan4ik/simdream-website/compare/v1.2.5...v1.3.0) (2026-11-08)


### Features

* **vouchers:** give Gift Cards a balance-first flow and the primary checkout button ([#49](https://github.com/hatan4ik/simdream-website/issues/49)) ([e861b5f](https://github.com/hatan4ik/simdream-website/commit/e861b5fc95246c85845e457b9ffa35173d2df972))

## [1.2.5](https://github.com/hatan4ik/simdream-website/compare/v1.2.4...v1.2.5) (2026-11-08)


### Bug Fixes

* **reviews:** show the grade, five yellow stars and the count when Google has no data ([#46](https://github.com/hatan4ik/simdream-website/issues/46)) ([874a16c](https://github.com/hatan4ik/simdream-website/commit/874a16c536d03ecf6c2da79a2fc53a60deec0400))
* **vouchers:** fit gift-card art to one shared frame and stop sideways scroll ([#45](https://github.com/hatan4ik/simdream-website/issues/45)) ([e6e3e14](https://github.com/hatan4ik/simdream-website/commit/e6e3e14fe9bec3477a01819a90f9614a0451a4e1))

## [1.2.4](https://github.com/hatan4ik/simdream-website/compare/v1.2.3...v1.2.4) (2026-11-08)


### Bug Fixes

* **vouchers:** fit digital gift card preview to whole frame ([#42](https://github.com/hatan4ik/simdream-website/issues/42)) ([35b2b33](https://github.com/hatan4ik/simdream-website/commit/35b2b3330a1caaa62e74176d345b3342c455fcd6))

## [1.2.3](https://github.com/hatan4ik/simdream-website/compare/v1.2.2...v1.2.3) (2026-11-07)


### Bug Fixes

* **book:** preserve route addons in compatible slots ([#40](https://github.com/hatan4ik/simdream-website/issues/40)) ([267bd7d](https://github.com/hatan4ik/simdream-website/commit/267bd7d6a50235545bb9c5f68cc9426e112c5a86))
* render gift-card designs and replace telemetry bar ([#39](https://github.com/hatan4ik/simdream-website/issues/39)) ([2b63204](https://github.com/hatan4ik/simdream-website/commit/2b6320446753cdadefdd12fc54606c729ceb905e))

## [1.2.2](https://github.com/hatan4ik/simdream-website/compare/v1.2.1...v1.2.2) (2026-11-07)


### Bug Fixes

* **ci:** deduplicate release verification ([#35](https://github.com/hatan4ik/simdream-website/issues/35)) ([6865ed5](https://github.com/hatan4ik/simdream-website/commit/6865ed503daf775d825926339d391afad85ff72b))
* **ci:** retain release check contexts ([#38](https://github.com/hatan4ik/simdream-website/issues/38)) ([e50df48](https://github.com/hatan4ik/simdream-website/commit/e50df48e7f0d84c4b49fd415a1ea38937b636d85))
* **ci:** verify generated release candidates ([#37](https://github.com/hatan4ik/simdream-website/issues/37)) ([4b3aef6](https://github.com/hatan4ik/simdream-website/commit/4b3aef61c9eecb0f4263e02500343f1a4d0eae08))

## [1.2.1](https://github.com/hatan4ik/simdream-website/compare/v1.2.0...v1.2.1) (2026-11-07)


### Bug Fixes

* **ci:** unblock verified Wix releases ([#33](https://github.com/hatan4ik/simdream-website/issues/33)) ([a459c1b](https://github.com/hatan4ik/simdream-website/commit/a459c1bbdb70bf0db0ee1688b17722cadde06201))

## [1.2.0](https://github.com/hatan4ik/simdream-website/compare/v1.1.1...v1.2.0) (2026-11-07)


### Features

* extend multilingual booking and gift-card experience ([#30](https://github.com/hatan4ik/simdream-website/issues/30)) ([6dcb8a2](https://github.com/hatan4ik/simdream-website/commit/6dcb8a24a095aa52d1d328170a590190ba933971))

## [1.1.1](https://github.com/hatan4ik/simdream-website/compare/v1.1.0...v1.1.1) (2026-11-07)


### Bug Fixes

* **legal:** unify company registration and calendar policy ([#27](https://github.com/hatan4ik/simdream-website/issues/27)) ([b580a50](https://github.com/hatan4ik/simdream-website/commit/b580a50811fefc5f5b03c836d5ed224c9ad44bac))

## [1.1.0](https://github.com/hatan4ik/simdream-website/compare/v1.0.0...v1.1.0) (2026-11-07)


### Features

* expand booking platform quality and operations ([3df5671](https://github.com/hatan4ik/simdream-website/commit/3df5671b70c6240a543b32ccde8d223a5c851a3c))
* harden booking platform and member experience ([78bf965](https://github.com/hatan4ik/simdream-website/commit/78bf9653d336528f83452576ee0e14b1da91de31))


### Bug Fixes

* **ci:** parse canonical Wix preview URL ([#22](https://github.com/hatan4ik/simdream-website/issues/22)) ([f727b0b](https://github.com/hatan4ik/simdream-website/commit/f727b0b614a3f78847f8daecf69b463813e82042))
* **ci:** use supported Node runtime for Wix releases ([#21](https://github.com/hatan4ik/simdream-website/issues/21)) ([2de9b36](https://github.com/hatan4ik/simdream-website/commit/2de9b36cf2298ededcce120a11770327042d57b5))
* **ci:** verify generated release candidates ([#25](https://github.com/hatan4ik/simdream-website/issues/25)) ([f34b6b7](https://github.com/hatan4ik/simdream-website/commit/f34b6b7e0e1a63f72b465008f49360f1937d2e6e))
* **ci:** wait for Wix route propagation ([#23](https://github.com/hatan4ik/simdream-website/issues/23)) ([f6aebdc](https://github.com/hatan4ik/simdream-website/commit/f6aebdc9370f3d776a01aeecb7c22048184b6bcf))
* stabilize semantic verification and mobile Safari gate ([#20](https://github.com/hatan4ik/simdream-website/issues/20)) ([ed4e6c6](https://github.com/hatan4ik/simdream-website/commit/ed4e6c6c52ef96763f8243011e76ab4d5d19793c))
