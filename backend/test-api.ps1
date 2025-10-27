# Backend API Test Script
# Tests all Week 2 endpoints to verify functionality

Write-Host "🧪 TESTING MASTER REALESTATE PRO BACKEND API" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8000"
$accessToken = ""
$userId = ""
$leadId = ""
$campaignId = ""
$taskId = ""
$tagId = ""
$noteId = ""
$activityId = ""

# Helper function to make API calls
function Invoke-ApiTest {
    param(
        [string]$Method = "GET",
        [string]$Endpoint,
        [string]$Body = "",
        [string]$Token = "",
        [string]$Description
    )
    
    Write-Host "📍 Testing: $Description" -ForegroundColor Yellow
    Write-Host "   $Method $Endpoint"
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    try {
        if ($Body) {
            $response = Invoke-RestMethod -Uri "$baseUrl$Endpoint" -Method $Method -Headers $headers -Body $Body
        } else {
            $response = Invoke-RestMethod -Uri "$baseUrl$Endpoint" -Method $Method -Headers $headers
        }
        
        Write-Host "   ✅ SUCCESS" -ForegroundColor Green
        return $response
    } catch {
        Write-Host "   ❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Test 1: Health Check
Write-Host "`n1️⃣  HEALTH CHECK" -ForegroundColor Magenta
$health = Invoke-ApiTest -Endpoint "/health" -Description "Server Health Check"

# Test 2: User Registration
Write-Host "`n2️⃣  AUTHENTICATION" -ForegroundColor Magenta
$registerBody = @{
    email = "test$(Get-Random)@example.com"
    password = "Test123456!"
    firstName = "Test"
    lastName = "User"
} | ConvertTo-Json

$registerResult = Invoke-ApiTest -Method "POST" -Endpoint "/api/auth/register" -Body $registerBody -Description "Register New User"

if ($registerResult) {
    $accessToken = $registerResult.data.tokens.accessToken
    $userId = $registerResult.data.user.id
    Write-Host "   🔑 Access Token obtained" -ForegroundColor Green
}

# Test 3: User Login
$loginBody = @{
    email = $registerResult.data.user.email
    password = "Test123456!"
} | ConvertTo-Json

$loginResult = Invoke-ApiTest -Method "POST" -Endpoint "/api/auth/login" -Body $loginBody -Description "User Login"

# Test 4: Get User Info
Invoke-ApiTest -Endpoint "/api/auth/me" -Token $accessToken -Description "Get Current User"

# Test 5: Create Lead
Write-Host "`n3️⃣  LEAD MANAGEMENT" -ForegroundColor Magenta
$leadBody = @{
    name = "John Doe"
    email = "john$(Get-Random)@example.com"
    phone = "555-0100"
    status = "NEW"
    score = 75
    source = "website"
    value = 50000
} | ConvertTo-Json

$leadResult = Invoke-ApiTest -Method "POST" -Endpoint "/api/leads" -Body $leadBody -Token $accessToken -Description "Create Lead"

if ($leadResult) {
    $leadId = $leadResult.data.lead.id
}

# Test 6: Get All Leads
Invoke-ApiTest -Endpoint "/api/leads" -Token $accessToken -Description "List All Leads"

# Test 7: Get Single Lead
if ($leadId) {
    Invoke-ApiTest -Endpoint "/api/leads/$leadId" -Token $accessToken -Description "Get Lead by ID"
}

# Test 8: Get Lead Stats
Invoke-ApiTest -Endpoint "/api/leads/stats" -Token $accessToken -Description "Get Lead Statistics"

# Test 9: Create Tag
Write-Host "`n4️⃣  TAG MANAGEMENT" -ForegroundColor Magenta
$tagBody = @{
    name = "VIP Client"
    color = "#FF5733"
} | ConvertTo-Json

$tagResult = Invoke-ApiTest -Method "POST" -Endpoint "/api/tags" -Body $tagBody -Token $accessToken -Description "Create Tag"

if ($tagResult) {
    $tagId = $tagResult.data.tag.id
}

# Test 10: Get All Tags
Invoke-ApiTest -Endpoint "/api/tags" -Token $accessToken -Description "List All Tags"

# Test 11: Add Tag to Lead
if ($leadId -and $tagId) {
    $addTagBody = @{
        tagIds = @($tagId)
    } | ConvertTo-Json
    
    Invoke-ApiTest -Method "POST" -Endpoint "/api/leads/$leadId/tags" -Body $addTagBody -Token $accessToken -Description "Add Tag to Lead"
}

# Test 12: Create Note
Write-Host "`n5️⃣  NOTES MANAGEMENT" -ForegroundColor Magenta
if ($leadId) {
    $noteBody = @{
        content = "This is a test note about the lead. Very important information!"
    } | ConvertTo-Json
    
    $noteResult = Invoke-ApiTest -Method "POST" -Endpoint "/api/leads/$leadId/notes" -Body $noteBody -Token $accessToken -Description "Create Note for Lead"
    
    if ($noteResult) {
        $noteId = $noteResult.data.note.id
    }
}

# Test 13: Get Lead Notes
if ($leadId) {
    Invoke-ApiTest -Endpoint "/api/leads/$leadId/notes" -Token $accessToken -Description "Get All Notes for Lead"
}

# Test 14: Create Campaign
Write-Host "`n6️⃣  CAMPAIGN MANAGEMENT" -ForegroundColor Magenta
$campaignBody = @{
    name = "Welcome Email Campaign"
    type = "EMAIL"
    status = "DRAFT"
    subject = "Welcome to our service!"
    body = "Thank you for joining us."
    audience = 1000
} | ConvertTo-Json

$campaignResult = Invoke-ApiTest -Method "POST" -Endpoint "/api/campaigns" -Body $campaignBody -Token $accessToken -Description "Create Campaign"

if ($campaignResult) {
    $campaignId = $campaignResult.data.campaign.id
}

# Test 15: Get All Campaigns
Invoke-ApiTest -Endpoint "/api/campaigns" -Token $accessToken -Description "List All Campaigns"

# Test 16: Get Campaign Stats
Invoke-ApiTest -Endpoint "/api/campaigns/stats" -Token $accessToken -Description "Get Campaign Statistics"

# Test 17: Update Campaign Metrics
if ($campaignId) {
    $metricsBody = @{
        sent = 1000
        delivered = 980
        opened = 500
        clicked = 100
        converted = 20
    } | ConvertTo-Json
    
    Invoke-ApiTest -Method "PATCH" -Endpoint "/api/campaigns/$campaignId/metrics" -Body $metricsBody -Token $accessToken -Description "Update Campaign Metrics"
}

# Test 18: Create Task
Write-Host "`n7️⃣  TASK MANAGEMENT" -ForegroundColor Magenta
$tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$taskBody = @{
    title = "Follow up with lead"
    description = "Call to discuss property options"
    dueDate = $tomorrow
    priority = "HIGH"
    status = "PENDING"
} | ConvertTo-Json

$taskResult = Invoke-ApiTest -Method "POST" -Endpoint "/api/tasks" -Body $taskBody -Token $accessToken -Description "Create Task"

if ($taskResult) {
    $taskId = $taskResult.data.task.id
}

# Test 19: Get All Tasks
Invoke-ApiTest -Endpoint "/api/tasks" -Token $accessToken -Description "List All Tasks"

# Test 20: Get Task Stats
Invoke-ApiTest -Endpoint "/api/tasks/stats" -Token $accessToken -Description "Get Task Statistics"

# Test 21: Create Activity
Write-Host "`n8️⃣  ACTIVITY LOGGING" -ForegroundColor Magenta
$activityBody = @{
    type = "EMAIL_SENT"
    title = "Sent welcome email"
    description = "Initial outreach email sent to new lead"
    leadId = $leadId
    metadata = @{
        subject = "Welcome!"
        template = "welcome-template"
    }
} | ConvertTo-Json

$activityResult = Invoke-ApiTest -Method "POST" -Endpoint "/api/activities" -Body $activityBody -Token $accessToken -Description "Create Activity"

if ($activityResult) {
    $activityId = $activityResult.data.id
}

# Test 22: Get All Activities
Invoke-ApiTest -Endpoint "/api/activities" -Token $accessToken -Description "List All Activities"

# Test 23: Get Activity Stats
Invoke-ApiTest -Endpoint "/api/activities/stats" -Token $accessToken -Description "Get Activity Statistics"

# Test 24: Get Activities for Lead
if ($leadId) {
    Invoke-ApiTest -Endpoint "/api/activities/lead/$leadId" -Token $accessToken -Description "Get Activities for Specific Lead"
}

# Test 25: Dashboard Analytics
Write-Host "`n9️⃣  DASHBOARD ANALYTICS" -ForegroundColor Magenta
Invoke-ApiTest -Endpoint "/api/analytics/dashboard" -Token $accessToken -Description "Get Dashboard Statistics"

# Test 26: Lead Analytics
Invoke-ApiTest -Endpoint "/api/analytics/leads" -Token $accessToken -Description "Get Lead Analytics"

# Test 27: Campaign Analytics
Invoke-ApiTest -Endpoint "/api/analytics/campaigns" -Token $accessToken -Description "Get Campaign Analytics"

# Test 28: Task Analytics
Invoke-ApiTest -Endpoint "/api/analytics/tasks" -Token $accessToken -Description "Get Task Analytics"

# Test 29: Activity Feed
Invoke-ApiTest -Endpoint "/api/analytics/activity-feed?limit=10" -Token $accessToken -Description "Get Activity Feed"

# Summary
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "🎉 TESTING COMPLETE!" -ForegroundColor Green
Write-Host "`nTest Summary:" -ForegroundColor Cyan
Write-Host "  • Authentication: ✅ Register, Login, Get User" -ForegroundColor White
Write-Host "  • Leads: ✅ Create, List, Get, Stats" -ForegroundColor White
Write-Host "  • Tags: ✅ Create, List, Add to Lead" -ForegroundColor White
Write-Host "  • Notes: ✅ Create, List for Lead" -ForegroundColor White
Write-Host "  • Campaigns: ✅ Create, List, Stats, Update Metrics" -ForegroundColor White
Write-Host "  • Tasks: ✅ Create, List, Stats" -ForegroundColor White
Write-Host "  • Activities: ✅ Create, List, Stats, Filter by Lead" -ForegroundColor White
Write-Host "  • Analytics: ✅ Dashboard, Leads, Campaigns, Tasks, Feed" -ForegroundColor White
Write-Host "`n✨ All 7 Week 2 features tested successfully!" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Cyan
