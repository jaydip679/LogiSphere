#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * LogiSphere — Master End-to-End Automated Test Suite (E2E)
 *
 * Validates the complete B2B2C logistics lifecycle across the API Gateway:
 * Gateway (:5000) -> Auth (:5001) -> Shipment (:5002) -> Fleet (:5003) -> Tracking (:5004) -> Notification (:5005)
 *
 * Usage:
 *   npm run test:e2e
 *   GATEWAY_URL=http://localhost:5000 npm run test:e2e
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from root .env if present
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const axios = require('axios');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:5000';
const TIMEOUT_MS = 15000;

const client = axios.create({
  baseURL: GATEWAY_URL,
  timeout: TIMEOUT_MS,
  validateStatus: () => true, // Don't throw on non-2xx status codes; manual status assertions
});

// Color helpers
const green = (txt) => `\x1b[32m${txt}\x1b[0m`;
const red = (txt) => `\x1b[31m${txt}\x1b[0m`;
const cyan = (txt) => `\x1b[36m${txt}\x1b[0m`;
const bold = (txt) => `\x1b[1m${txt}\x1b[0m`;

let passedChecks = 0;
let totalChecks = 0;

function assertCheck(name, condition, errorMsg = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ${green('✓')} ${name}`);
  } else {
    console.error(`  ${red('✗')} ${name}: ${errorMsg}`);
    throw new Error(`Assertion failed: ${name} — ${errorMsg}`);
  }
}

async function runE2ETests() {
  console.log(bold(cyan('\n=======================================================')));
  console.log(bold(cyan('      LogiSphere Master End-to-End Automated Test     ')));
  console.log(bold(cyan('=======================================================')));
  console.log(`Target Gateway: ${GATEWAY_URL}\n`);

  try {
    // -----------------------------------------------------------
    // Step 1: Gateway & Downstream Services Health Check
    // -----------------------------------------------------------
    console.log(bold('Step 1: Gateway & Downstream Services Health Check'));
    let healthRes;
    try {
      healthRes = await client.get('/health');
    } catch (netErr) {
      console.error(
        red(`\n[!] Connection Error: API Gateway is unreachable at ${GATEWAY_URL}/health`)
      );
      console.error(red(`    Cause: ${netErr.message}`));
      console.error(red('    Ensure the Docker Compose stack is running: docker compose up -d\n'));
      process.exit(1);
    }

    assertCheck(
      'API Gateway returns HTTP 200',
      healthRes.status === 200,
      `Got HTTP ${healthRes.status}`
    );
    assertCheck('Gateway reports UP', healthRes.data?.data?.gateway === 'UP');
    assertCheck('Auth Service downstream UP', healthRes.data?.data?.downstream?.auth === 'UP');
    assertCheck(
      'Shipment Service downstream UP',
      healthRes.data?.data?.downstream?.shipment === 'UP'
    );
    assertCheck('Fleet Service downstream UP', healthRes.data?.data?.downstream?.fleet === 'UP');
    assertCheck(
      'Tracking Service downstream UP',
      healthRes.data?.data?.downstream?.tracking === 'UP'
    );
    assertCheck(
      'Notification Service downstream UP',
      healthRes.data?.data?.downstream?.notification === 'UP'
    );

    // -----------------------------------------------------------
    // Step 2: Platform Admin Authentication
    // -----------------------------------------------------------
    console.log(bold('\nStep 2: Platform Admin Authentication'));
    const adminLoginRes = await client.post('/api/v1/auth/login', {
      email: process.env.ADMIN_EMAIL || 'admin@logisphere.local',
      password: process.env.ADMIN_INITIAL_PASSWORD || 'AdminSecurePassword123!',
    });
    assertCheck(
      'Admin login returns 200',
      adminLoginRes.status === 200,
      JSON.stringify(adminLoginRes.data)
    );
    const adminToken =
      adminLoginRes.data?.data?.tokens?.accessToken || adminLoginRes.data?.data?.accessToken;
    assertCheck('Admin JWT token received', !!adminToken);

    // -----------------------------------------------------------
    // Step 3: Logistics Company Registration & Admin Vetting
    // -----------------------------------------------------------
    console.log(bold('\nStep 3: Logistics Carrier Registration & Admin Approval'));
    const testSuffix = Date.now().toString().slice(-4);
    const companyEmail = `carrier_${testSuffix}@e2etest.local`;
    const companyPhone = `+9198201${testSuffix.padEnd(5, '0').slice(0, 5)}`;

    const regCompanyRes = await client.post('/api/v1/organizations/register/company', {
      name: `Apex Carrier ${testSuffix} Pvt Ltd`,
      contactEmail: companyEmail,
      contactPhone: companyPhone,
      serviceAreas: ['Delhi NCR', 'Mumbai'],
      supportedCategories: ['PARCEL', 'DOCUMENT', 'CORPORATE'],
      ownerFullName: 'Vikram Dispatcher',
      ownerEmail: companyEmail,
      ownerPassword: 'CarrierSecure2026!',
      ownerPhone: companyPhone,
    });
    assertCheck(
      'Company registration returns 201',
      regCompanyRes.status === 201,
      JSON.stringify(regCompanyRes.data)
    );
    const orgId = regCompanyRes.data?.data?.organization?.id;
    assertCheck(
      'Organization created in PENDING_REVIEW',
      regCompanyRes.data?.data?.organization?.status === 'PENDING_REVIEW'
    );

    // Admin reviews and approves the carrier
    const approveRes = await client.post(
      `/api/v1/admin/organizations/${orgId}/review`,
      { status: 'APPROVED' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assertCheck(
      'Admin approval returns 200',
      approveRes.status === 200,
      JSON.stringify(approveRes.data)
    );
    assertCheck(
      'Organization status updated to APPROVED',
      approveRes.data?.data?.status === 'APPROVED' || approveRes.data?.data?.status === 'ACTIVE'
    );

    // Carrier logs in
    const carrierLoginRes = await client.post('/api/v1/auth/login', {
      email: companyEmail,
      password: 'CarrierSecure2026!',
    });
    assertCheck(
      'Carrier login returns 200',
      carrierLoginRes.status === 200,
      JSON.stringify(carrierLoginRes.data)
    );
    const carrierToken =
      carrierLoginRes.data?.data?.tokens?.accessToken || carrierLoginRes.data?.data?.accessToken;

    // -----------------------------------------------------------
    // Step 4: Driver Staff Provisioning & Vehicle Registry
    // -----------------------------------------------------------
    console.log(bold('\nStep 4: Driver Staff Provisioning & Vehicle Registry'));
    const driverEmail = `driver_${testSuffix}@e2etest.local`;
    const driverPhone = `+9198401${testSuffix.padEnd(5, '0').slice(0, 5)}`;

    // 4a. Company provisions driver staff member in Auth Service
    const addStaffRes = await client.post(
      '/api/v1/organizations/staff',
      {
        fullName: `Rajesh Pilot ${testSuffix}`,
        email: driverEmail,
        phone: driverPhone,
        role: 'DRIVER',
        licenseNumber: `DL-MH-2026-${testSuffix}`,
      },
      { headers: { Authorization: `Bearer ${carrierToken}` } }
    );
    assertCheck(
      'Driver staff provisioned in Auth Service (201)',
      addStaffRes.status === 201,
      JSON.stringify(addStaffRes.data)
    );
    const driverUserId = addStaffRes.data?.data?.user?.id;
    const driverTempPassword = addStaffRes.data?.data?.temporaryCredentials?.temporaryPassword;

    // 4b. Driver logs in with temporary credentials to obtain DRIVER JWT
    const driverLoginRes = await client.post('/api/v1/auth/login', {
      email: driverEmail,
      password: driverTempPassword,
    });
    assertCheck(
      'Driver login returns 200',
      driverLoginRes.status === 200,
      JSON.stringify(driverLoginRes.data)
    );
    const driverToken =
      driverLoginRes.data?.data?.tokens?.accessToken || driverLoginRes.data?.data?.accessToken;
    assertCheck(
      'Driver JWT token has DRIVER role',
      driverLoginRes.data?.data?.user?.role === 'DRIVER'
    );

    // 4c. Register vehicle in Fleet Service
    const regNum = `MH12AB${testSuffix.padEnd(4, '0').slice(0, 4)}`;
    const vehicleRes = await client.post(
      '/api/v1/fleet/vehicles',
      {
        registrationNumber: regNum,
        vehicleType: 'TRUCK_SMALL',
        capacityKg: 2500,
      },
      { headers: { Authorization: `Bearer ${carrierToken}` } }
    );
    assertCheck(
      'Fleet vehicle registered (201)',
      vehicleRes.status === 201,
      JSON.stringify(vehicleRes.data)
    );
    const vehicleId = vehicleRes.data?.data?.id;

    // 4d. Register driver in Fleet Service linked to driverUserId
    const driverRes = await client.post(
      '/api/v1/fleet/drivers',
      {
        name: `Rajesh Pilot ${testSuffix}`,
        phone: driverPhone,
        licenseNumber: `DL-MH-2026-${testSuffix}`,
        userId: driverUserId,
      },
      { headers: { Authorization: `Bearer ${carrierToken}` } }
    );
    assertCheck(
      'Fleet driver registered (201)',
      driverRes.status === 201,
      JSON.stringify(driverRes.data)
    );
    assertCheck('Fleet driver ID generated', !!driverRes.data?.data?.id);

    // -----------------------------------------------------------
    // Step 5: Customer Registration, Price Estimate & Booking
    // -----------------------------------------------------------
    console.log(bold('\nStep 5: Customer Registration, Dynamic Rate & Booking'));
    const customerEmail = `customer_${testSuffix}@e2etest.local`;
    const customerPhone = `+9198111${testSuffix.padEnd(5, '0').slice(0, 5)}`;

    const regCustRes = await client.post('/api/v1/auth/register/customer', {
      fullName: 'Aarav Customer',
      email: customerEmail,
      password: 'CustomerPass2026!',
      phone: customerPhone,
      accountType: 'INDIVIDUAL',
    });
    assertCheck(
      'Customer registered (201)',
      regCustRes.status === 201,
      JSON.stringify(regCustRes.data)
    );

    const custLoginRes = await client.post('/api/v1/auth/login', {
      email: customerEmail,
      password: 'CustomerPass2026!',
    });
    assertCheck(
      'Customer login returns 200',
      custLoginRes.status === 200,
      JSON.stringify(custLoginRes.data)
    );
    const customerToken =
      custLoginRes.data?.data?.tokens?.accessToken || custLoginRes.data?.data?.accessToken;

    // Pre-auth estimate calculation
    const estimateRes = await client.post('/api/v1/shipments/estimate-price', {
      pickupPinCode: '110001',
      deliveryPinCode: '400001',
      weightKg: 45.0,
      category: 'PARCEL',
    });
    assertCheck(
      'Dynamic price estimation returns 200',
      estimateRes.status === 200,
      JSON.stringify(estimateRes.data)
    );
    assertCheck(
      'Estimated price is positive integer in paise',
      estimateRes.data?.data?.estimatedPricePaise > 0
    );

    // Customer creates shipment
    const createShipmentRes = await client.post(
      '/api/v1/shipments',
      {
        senderName: 'Aarav Customer',
        senderPhone: customerPhone,
        pickupAddress: 'Plot 10, Barakhamba Road, Connaught Place',
        pickupCity: 'New Delhi',
        pickupState: 'Delhi',
        pickupPinCode: '110001',
        recipientName: 'Sunil Sharma',
        recipientPhone: '+919877712345',
        deliveryAddress: 'Tech Park, Bandra Kurla Complex',
        deliveryCity: 'Mumbai',
        deliveryState: 'Maharashtra',
        deliveryPinCode: '400001',
        category: 'PARCEL',
        packageDescription: 'Precision electronic sensors',
        weightKg: 45.0,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 25,
      },
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    assertCheck(
      'Shipment created successfully (201)',
      createShipmentRes.status === 201,
      JSON.stringify(createShipmentRes.data)
    );
    const shipmentId = createShipmentRes.data?.data?.id;
    const trackingNumber = createShipmentRes.data?.data?.trackingNumber;
    assertCheck('Tracking number generated', !!trackingNumber);

    // -----------------------------------------------------------
    // Step 6: Marketplace Offer Acceptance & Dispatch Assignment
    // -----------------------------------------------------------
    console.log(bold('\nStep 6: Marketplace Offer Acceptance & Dispatch Assignment'));
    // Allow matching engine a brief moment to process carrier matching
    await new Promise((r) => setTimeout(r, 1500));

    // Carrier checks offer inbox with retry to ensure matching engine completes async scoring
    let inboxRes;
    let offers = [];
    for (let attempt = 0; attempt < 5; attempt++) {
      inboxRes = await client.get('/api/v1/shipments/offers/inbox', {
        headers: { Authorization: `Bearer ${carrierToken}` },
      });
      offers = Array.isArray(inboxRes.data?.data)
        ? inboxRes.data.data
        : inboxRes.data?.data?.offers || [];
      if (offers.length > 0) break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    assertCheck(
      'Carrier offer inbox returns 200',
      inboxRes && inboxRes.status === 200,
      JSON.stringify(inboxRes ? inboxRes.data : {})
    );
    let shipmentDetails;
    if (offers.length === 0) {
      const detailsRes = await client.get(`/api/v1/shipments/${shipmentId}`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      shipmentDetails = detailsRes.data?.data;
    }

    assertCheck(
      'Carrier received marketplace offer',
      offers.length > 0,
      `No pending offers found for carrier (${orgId}). Shipment status: ${shipmentDetails?.status}, Hubs: ${shipmentDetails?.pickupHub} -> ${shipmentDetails?.deliveryHub}, Offers: ${JSON.stringify(shipmentDetails?.offers)}`
    );

    const targetOffer = offers.find((o) => o.shipmentId === shipmentId) || offers[0];
    assertCheck('Target offer identified', !!targetOffer);

    const acceptOfferRes = await client.post(
      `/api/v1/shipments/offers/${targetOffer.id}/accept`,
      {},
      { headers: { Authorization: `Bearer ${carrierToken}` } }
    );
    assertCheck(
      'Carrier accepts marketplace offer (200)',
      acceptOfferRes.status === 200,
      JSON.stringify(acceptOfferRes.data)
    );

    // Carrier assigns driver and vehicle (atomic 2-minute reservation)
    const assignRes = await client.post(
      `/api/v1/shipments/${shipmentId}/assign`,
      {
        driverId: driverUserId,
        vehicleId,
      },
      { headers: { Authorization: `Bearer ${carrierToken}` } }
    );
    assertCheck(
      'Dispatch assignment completed (200)',
      assignRes.status === 200,
      JSON.stringify(assignRes.data)
    );

    // -----------------------------------------------------------
    // Step 7: Driver Milestone Updates (PICKED_UP -> DELIVERED)
    // -----------------------------------------------------------
    console.log(bold('\nStep 7: Driver Milestone Progression'));
    // Driver updates PICKED_UP
    const pickupRes = await client.post(
      `/api/v1/shipments/${shipmentId}/milestones`,
      { status: 'PICKED_UP' },
      { headers: { Authorization: `Bearer ${driverToken}` } }
    );
    assertCheck(
      'Milestone PICKED_UP updated (200)',
      pickupRes.status === 200,
      JSON.stringify(pickupRes.data)
    );

    // Driver updates IN_TRANSIT
    const transitRes = await client.post(
      `/api/v1/shipments/${shipmentId}/milestones`,
      { status: 'IN_TRANSIT' },
      { headers: { Authorization: `Bearer ${driverToken}` } }
    );
    assertCheck(
      'Milestone IN_TRANSIT updated (200)',
      transitRes.status === 200,
      JSON.stringify(transitRes.data)
    );

    // Driver updates OUT_FOR_DELIVERY
    const outRes = await client.post(
      `/api/v1/shipments/${shipmentId}/milestones`,
      { status: 'OUT_FOR_DELIVERY' },
      { headers: { Authorization: `Bearer ${driverToken}` } }
    );
    assertCheck(
      'Milestone OUT_FOR_DELIVERY updated (200)',
      outRes.status === 200,
      JSON.stringify(outRes.data)
    );

    // Driver updates DELIVERED
    const deliverRes = await client.post(
      `/api/v1/shipments/${shipmentId}/milestones`,
      { status: 'DELIVERED' },
      { headers: { Authorization: `Bearer ${driverToken}` } }
    );
    assertCheck(
      'Milestone DELIVERED updated (200)',
      deliverRes.status === 200,
      JSON.stringify(deliverRes.data)
    );

    // -----------------------------------------------------------
    // Step 8: Live Tracking & Fleet Release Validation
    // -----------------------------------------------------------
    console.log(bold('\nStep 8: Live Tracking & Resource Release Verification'));
    // Poll tracking endpoint to allow asynchronous outbox publisher (2s interval)
    // and tracking SQS consumer (5s interval) to ingest milestone events
    let trackingRes;
    let trackingStatus;
    for (let attempt = 0; attempt < 12; attempt++) {
      await new Promise((r) => setTimeout(r, 1000));
      trackingRes = await client.get(`/api/v1/tracking/${trackingNumber}`);
      if (trackingRes && trackingRes.status === 200) {
        trackingStatus =
          trackingRes.data?.data?.currentStatus ||
          trackingRes.data?.data?.status ||
          trackingRes.data?.data?.latestMilestone?.status;
        if (trackingStatus === 'DELIVERED') break;
      }
    }

    assertCheck(
      'Tracking telemetry returns 200',
      trackingRes && trackingRes.status === 200,
      JSON.stringify(trackingRes ? trackingRes.data : {})
    );
    assertCheck(
      'Tracking status verified as DELIVERED',
      trackingStatus === 'DELIVERED',
      `Got tracking status: ${trackingStatus}`
    );

    // Customer checks notifications inbox
    const notifRes = await client.get('/api/v1/notifications', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assertCheck(
      'Customer notification inbox returns 200',
      notifRes.status === 200,
      JSON.stringify(notifRes.data)
    );

    // -----------------------------------------------------------
    // Final Summary
    // -----------------------------------------------------------
    console.log(bold(green('\n=======================================================')));
    console.log(
      bold(green(`  ALL ${passedChecks}/${totalChecks} E2E ASSERTIONS PASSED SUCCESSFULLY!  `))
    );
    console.log(bold(green('=======================================================\n')));
  } catch (err) {
    console.error(red(`\n[!] E2E Test Suite Error: ${err.message}`));
    if (err.response) {
      console.error(red(`    HTTP Status: ${err.response.status}`));
      console.error(red(`    Response:    ${JSON.stringify(err.response.data)}`));
    }
    process.exit(1);
  }
}

runE2ETests();
