# Amazon SP-API Application Setup Guide

This guide walks you through setting up your Amazon Selling Partner API (SP-API) application for the forecast system.

## Prerequisites

1. Amazon Professional Seller Account
2. Amazon Developer Account (free)

## Step 1: Register as a Developer

1. Go to [Amazon Developer Central](https://developer.amazonservices.com/)
2. Sign in with your Amazon Seller credentials
3. Click **"Developer Central"** → **"Add new client"**

## Step 2: Create SP-API Application

1. In Developer Central, go to **"Developer Console"** → **"Apps & Services"** → **"SP-API"**
2. Click **"Register new application"** (or "Add new app client")
3. Fill in the details:
   - **App name**: Your application name (e.g., "My Forecast Tool")
   - **API Type**: Select **SP-API**
   - **Application type**: Select **Self-Authorized** (for your own seller account)

## Step 3: Configure Required Roles

**IMPORTANT**: For full historical data access, you need these roles:

### Required Roles:
| Role | Purpose | Grants Access To |
|------|---------|------------------|
| **Product Listing** | Product catalog | Catalog Items API |
| **Inventory and Order Management** | FBA inventory | FBA Inventory API |
| **Direct-to-Consumer Shipping** | Order data (CRITICAL!) | Orders API, Reports API |
| **Reports** | Report generation | All report types |

### How to Add Roles:
1. In your SP-API app settings, click **"Edit app"** or **"Manage"**
2. Under **"API Roles"** or **"Roles"**, add:
   - ✅ Product Listing
   - ✅ Inventory and Order Management  
   - ✅ **Direct-to-Consumer Shipping** ← This is REQUIRED for full historical data!
   - ✅ Reports

## Step 4: Configure OAuth Settings

1. In your app settings, find **"OAuth settings"** or **"App credentials"**
2. Set the **Redirect URI**: `https://your-domain.com/api/v1/amazon/callback/`
   - For local testing: `http://localhost:8000/api/v1/amazon/callback/`
3. Note down:
   - **Application ID** (App ID)
   - **Client ID** (LWA Client ID)
   - **Client Secret** (LWA Client Secret)

## Step 5: Self-Authorization (Recommended for Your Own Account)

If you're using this for your own seller account:

1. Go to **Seller Central** → **Apps & Services** → **Manage Your Apps**
2. Find your application and click **"Authorize"**
3. Grant the requested permissions
4. You'll receive a **Refresh Token** - save this securely!

## Step 6: Configure Environment Variables

Add these to your `.env` file:

```env
# Amazon SP-API Credentials
AMAZON_SP_API_CLIENT_ID=amzn1.application-oa2-client.xxxxx
AMAZON_SP_API_CLIENT_SECRET=amzn1.oa2-cs.v1.xxxxx
AMAZON_SP_API_APP_ID=amzn1.sp.solution.xxxxx
AMAZON_SP_API_REFRESH_TOKEN=Atzr|xxxxx

# OAuth Redirect URI (must match what's configured in Amazon)
AMAZON_OAUTH_REDIRECT_URI=http://localhost:8000/api/v1/amazon/callback/

# Frontend URL for redirects
FRONTEND_URL=http://localhost:3000
```

## Troubleshooting

### Error: 403 Forbidden on Reports API
**Cause**: Missing "Direct-to-Consumer Shipping" role
**Solution**: Add the role in Developer Central and re-authorize

### Error: Token Refresh Failed
**Cause**: Invalid or expired refresh token
**Solution**: Re-authorize your application in Seller Central

### Error: Invalid State
**Cause**: OAuth session expired (10 minutes)
**Solution**: Start the authorization flow again

## Available Report Types by Role

| Report Type | Required Role |
|-------------|---------------|
| `GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE` | Direct-to-Consumer Shipping |
| `GET_SALES_AND_TRAFFIC_REPORT` | Product Listing |
| `GET_RESTOCK_INVENTORY_RECOMMENDATIONS_REPORT` | Inventory and Order Management |
| `GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA` | Inventory and Order Management |
| `GET_MERCHANT_LISTINGS_ALL_DATA` | Product Listing |

## Data Access Summary

| Data Type | API/Report | Historical Range | Role Required |
|-----------|------------|------------------|---------------|
| Products | Catalog API | Current | Product Listing |
| Inventory | FBA Inventory API | Current | Inventory and Order Management |
| Sales (30 days) | Restock Report | 30 days velocity | Inventory and Order Management |
| Sales (6 months) | Sales & Traffic Report | ~60-90 days | Product Listing |
| Sales (2 years) | Orders Report | 730 days | **Direct-to-Consumer Shipping** |

## Next Steps

After completing setup:
1. Restart your backend server
2. Go to Settings → Link Amazon Account
3. Complete the OAuth flow
4. Wait for initial sync (~5-10 minutes for full history)
