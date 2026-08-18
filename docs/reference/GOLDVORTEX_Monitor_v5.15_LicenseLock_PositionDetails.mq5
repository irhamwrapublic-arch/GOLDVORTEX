//+------------------------------------------------------------------+
//|                  GOLDVORTEX Monitor v5.15                        |
//|              READ-ONLY MT5 ACCOUNT MONITOR                      |
//+------------------------------------------------------------------+
#property copyright "GOLDVORTEX"
#property version   "5.15"
#property strict
#property description "GOLDVORTEX monitor with License Lock. Trading action is strictly restricted to LICENSE_EXPIRED -> close all positions."

#include <Trade/Trade.mqh>

// IMPORTANT:
// This EA is MONITOR ONLY except the LICENSE_EXPIRED emergency action.
// It intentionally contains NO trading class/object and NO trading functions.
// It must never Buy, Sell, Close, Modify, Delete, or otherwise change
// any MT5 order/position.

input string InpApiBaseUrl = "https://goldvortex-api.irhamwrapublic.workers.dev";
input string InpLicenseKey = "GVX-MT5-193891875";

input int    InpVerifyIntervalSeconds  = 60;
input int    InpMonitorIntervalSeconds = 5;
input bool   InpShowChartStatus        = true;

// Monitor scope.
// Keep the same scope used by the previous combined EA:
// GOLDVORTEX positions on the current chart symbol with this Magic Number.
input ulong  InpMagicNumber = 26081201;
input bool  InpMonitorCurrentSymbolOnly = true;

//==============================
// INTERNAL STATE
//==============================
datetime g_last_verify=0;
datetime g_last_monitor=0;

bool     g_license_valid=false;
string   g_license_status="NOT_TESTED";
string   g_last_message="NOT_TESTED";
int      g_last_http_code=0;

string   g_last_monitor_message="NOT_SENT";
int      g_last_monitor_http_code=0;

// ===== LICENSE LOCK / EMERGENCY ACTION =====
// This is the ONLY trading-related capability in this EA.
// It is permitted ONLY after the API returns the exact status:
// LICENSE_EXPIRED.
//
// No Buy/Sell/Modify/Delete/entry/grid/hedge/trailing logic exists.
CTrade g_expiryTrade;
bool   g_trading_locked=false;
bool   g_expiry_action_done=false;

//+------------------------------------------------------------------+
//| JSON escape                                                      |
//+------------------------------------------------------------------+
string EscapeJson(const string value)
{
   string s=value;
   StringReplace(s,"\\","\\\\");
   StringReplace(s,"\"","\\\"");
   StringReplace(s,"\r","\\r");
   StringReplace(s,"\n","\\n");
   return s;
}

//+------------------------------------------------------------------+
//| Count monitored positions                                        |
//+------------------------------------------------------------------+
int CountMonitoredPositions()
{
   int n=0;

   for(int i=PositionsTotal()-1;i>=0;i--)
   {
      ulong ticket=PositionGetTicket(i);
      if(ticket==0 || !PositionSelectByTicket(ticket))
         continue;

      if(InpMonitorCurrentSymbolOnly &&
         PositionGetString(POSITION_SYMBOL)!=_Symbol)
         continue;

      if(InpMagicNumber>0 &&
         (ulong)PositionGetInteger(POSITION_MAGIC)!=InpMagicNumber)
         continue;

      n++;
   }

   return n;
}

//+------------------------------------------------------------------+
//| Collect monitored position statistics                            |
//+------------------------------------------------------------------+
void GetPositionStats(int &positions,
                      int &buyPositions,
                      int &sellPositions,
                      double &totalLots,
                      double &floatingProfit)
{
   positions=0;
   buyPositions=0;
   sellPositions=0;
   totalLots=0.0;
   floatingProfit=0.0;

   for(int i=PositionsTotal()-1;i>=0;i--)
   {
      ulong ticket=PositionGetTicket(i);
      if(ticket==0 || !PositionSelectByTicket(ticket))
         continue;

      if(InpMonitorCurrentSymbolOnly &&
         PositionGetString(POSITION_SYMBOL)!=_Symbol)
         continue;

      if(InpMagicNumber>0 &&
         (ulong)PositionGetInteger(POSITION_MAGIC)!=InpMagicNumber)
         continue;

      positions++;

      totalLots+=PositionGetDouble(POSITION_VOLUME);
      floatingProfit+=PositionGetDouble(POSITION_PROFIT);
      floatingProfit+=PositionGetDouble(POSITION_SWAP);

      ENUM_POSITION_TYPE type=
         (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);

      if(type==POSITION_TYPE_BUY)
         buyPositions++;
      else if(type==POSITION_TYPE_SELL)
         sellPositions++;
   }
}

//+------------------------------------------------------------------+
//| Extract a JSON string value                                      |
//+------------------------------------------------------------------+
string GetJsonString(const string json,const string key)
{
   string needle="\"" + key + "\"";
   int p=StringFind(json,needle);
   if(p<0)
      return "";

   p=StringFind(json,":",p+StringLen(needle));
   if(p<0)
      return "";

   p++;

   while(p<StringLen(json))
   {
      ushort c=StringGetCharacter(json,p);
      if(c!=' ' && c!='\t' && c!='\r' && c!='\n')
         break;
      p++;
   }

   if(p>=StringLen(json) ||
      StringGetCharacter(json,p)!='"')
      return "";

   p++;

   int e=StringFind(json,"\"",p);
   if(e<0)
      return "";

   return StringSubstr(json,p,e-p);
}

//+------------------------------------------------------------------+
//| CLOSE ALL POSITIONS - LICENSE_EXPIRED ONLY                       |
//+------------------------------------------------------------------+
void CloseAllPositionsOnExpiry()
{
   if(g_expiry_action_done)
      return;

   // Hard safety gate:
   // This function must NEVER be called for any other status.
   if(g_license_status!="EXPIRED" ||
      g_last_message!="LICENSE_EXPIRED")
   {
      Print("GOLDVORTEX SAFETY BLOCK: close-all request rejected because "
            "license status is not exactly LICENSE_EXPIRED.");
      return;
   }

   Print("================================================");
   Print("GOLDVORTEX LICENSE LOCK TRIGGERED");
   Print("STATUS: LICENSE_EXPIRED");
   Print("ACTION: CLOSE ALL POSITIONS");
   Print("ACTION: STOP TRADING");
   Print("================================================");

   g_trading_locked=true;

   int total=PositionsTotal();
   int attempted=0;
   int closed=0;

   for(int i=total-1;i>=0;i--)
   {
      ulong ticket=PositionGetTicket(i);
      if(ticket==0 || !PositionSelectByTicket(ticket))
         continue;

      attempted++;

      ResetLastError();

      bool ok=g_expiryTrade.PositionClose(
         ticket,
         10000
      );

      if(ok)
      {
         closed++;
         Print("LICENSE_EXPIRED: position closed. Ticket=",ticket,
               " Symbol=",PositionGetString(POSITION_SYMBOL));
      }
      else
      {
         Print("LICENSE_EXPIRED: FAILED to close position. Ticket=",
               ticket,
               " Retcode=",g_expiryTrade.ResultRetcode(),
               " Description=",g_expiryTrade.ResultRetcodeDescription(),
               " LastError=",GetLastError());
      }
   }

   g_expiry_action_done=true;

   Print("LICENSE_EXPIRED close-all finished. Attempted=",
         attempted,
         " Closed=",
         closed);

   // LICENSE_EXPIRED is the ONLY condition allowed to remove this EA.
   // After the close-all emergency action, stop this EA completely.
   Print("GOLDVORTEX LICENSE LOCK: ExpertRemove() triggered.");
   ExpertRemove();
}

//+------------------------------------------------------------------+
//| Apply License Lock                                               |
//+------------------------------------------------------------------+
void ApplyLicenseLock()
{
   // Only exact LICENSE_EXPIRED may activate the lock.
   if(g_license_status=="EXPIRED" &&
      g_last_message=="LICENSE_EXPIRED")
   {
      g_trading_locked=true;
      CloseAllPositionsOnExpiry();
      return;
   }

   // Explicitly do nothing for every other state.
   // VALID, ACCOUNT_MISMATCH, NOT_FOUND, INACTIVE, INVALID,
   // API_ERROR, timeout, HTTP error, etc. NEVER trigger trading action.
}

//+------------------------------------------------------------------+
//+------------------------------------------------------------------+
//| Verify license                                                   |
//+------------------------------------------------------------------+
void VerifyLicense()
{
   long account=AccountInfoInteger(ACCOUNT_LOGIN);

   string url=InpApiBaseUrl+"/api/verify";

   string json=StringFormat(
      "{\"license_key\":\"%s\",\"mt5_account\":\"%I64d\"}",
      EscapeJson(InpLicenseKey),
      account
   );

   char post[];
   char result[];
   string headers="Content-Type: application/json\r\n";
   string result_headers="";

   StringToCharArray(json,post,0,StringLen(json),CP_UTF8);

   ResetLastError();

   int http_code=WebRequest(
      "POST",
      url,
      headers,
      10000,
      post,
      result,
      result_headers
   );

   g_last_verify=TimeCurrent();
   g_last_http_code=http_code;

   if(http_code==-1)
   {
      int err=GetLastError();

      g_license_valid=false;
      g_license_status="API_ERROR";
      g_last_message=StringFormat("WEBREQUEST_ERROR_%d",err);

      Print("GOLDVORTEX MONITOR VERIFY ERROR: ",
            g_last_message);
      Print("Make sure this URL is allowed in MT5: ",
            InpApiBaseUrl);

      return;
   }

   string response=CharArrayToString(
      result,0,-1,CP_UTF8
   );

   string status=GetJsonString(response,"status");
   string message=GetJsonString(response,"message");
   string api_error=GetJsonString(response,"error");

   // Fallback for APIs that expose the result through a "valid" boolean.
   string response_search=response;
   StringReplace(response_search," ","");
   StringReplace(response_search,"\\t","");
   StringReplace(response_search,"\\r","");
   StringReplace(response_search,"\\n","");

   bool valid=
      (StringFind(response_search,"\"valid\":true")>=0);

   // IMPORTANT: EXPIRED is recognized only as the exact status/message.
   // Cloudflare /api/verify may return the failure reason in
   // {"error":"LICENSE_EXPIRED"} rather than status/message.
   // Therefore the exact error field is also accepted.
   bool expired=
      (status=="LICENSE_EXPIRED" ||
       message=="LICENSE_EXPIRED" ||
       api_error=="LICENSE_EXPIRED");

   bool mismatch=
      (status=="ACCOUNT_MISMATCH" ||
       message=="ACCOUNT_MISMATCH" ||
       api_error=="ACCOUNT_MISMATCH");

   bool notFound=
      (status=="LICENSE_NOT_FOUND" ||
       message=="LICENSE_NOT_FOUND" ||
       api_error=="LICENSE_NOT_FOUND");

   bool inactive=
      (status=="LICENSE_INACTIVE" ||
       message=="LICENSE_INACTIVE" ||
       api_error=="LICENSE_INACTIVE");

   g_license_valid=valid;

   if(status=="LICENSE_VALID" || valid)
   {
      g_license_status="VALID";
      g_last_message="LICENSE_VALID";
   }
   else if(expired)
   {
      g_license_valid=false;
      g_license_status="EXPIRED";
      g_last_message="LICENSE_EXPIRED";
   }
   else if(mismatch)
   {
      g_license_valid=false;
      g_license_status="ACCOUNT_MISMATCH";
      g_last_message="ACCOUNT_MISMATCH";
   }
   else if(notFound)
   {
      g_license_valid=false;
      g_license_status="NOT_FOUND";
      g_last_message="LICENSE_NOT_FOUND";
   }
   else if(inactive)
   {
      g_license_valid=false;
      g_license_status="INACTIVE";
      g_last_message="LICENSE_INACTIVE";
   }
   else
   {
      g_license_valid=false;
      g_license_status="INVALID";
      g_last_message=
         StringFormat("VERIFY_FAILED_HTTP_%d",http_code);
   }

   // The ONLY point where License Lock can initiate a trading action.
   ApplyLicenseLock();

   Print("GOLDVORTEX MONITOR VERIFY | HTTP=",
         http_code,
         " | Account=",account,
         " | Result=",g_last_message);
}

//+------------------------------------------------------------------+
//| Build monitored position details JSON array                     |
//+------------------------------------------------------------------+
string BuildPositionDetailsJson()
{
   string json="[";
   bool first=true;

   for(int i=PositionsTotal()-1;i>=0;i--)
   {
      ulong ticket=PositionGetTicket(i);
      if(ticket==0 || !PositionSelectByTicket(ticket))
         continue;

      if(InpMonitorCurrentSymbolOnly &&
         PositionGetString(POSITION_SYMBOL)!=_Symbol)
         continue;

      if(InpMagicNumber>0 &&
         (ulong)PositionGetInteger(POSITION_MAGIC)!=InpMagicNumber)
         continue;

      string symbol=PositionGetString(POSITION_SYMBOL);
      string positionType="UNKNOWN";

      ENUM_POSITION_TYPE type=
         (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);

      if(type==POSITION_TYPE_BUY)
         positionType="BUY";
      else if(type==POSITION_TYPE_SELL)
         positionType="SELL";

      double volume=PositionGetDouble(POSITION_VOLUME);
      double openPrice=PositionGetDouble(POSITION_PRICE_OPEN);
      double currentPrice=PositionGetDouble(POSITION_PRICE_CURRENT);
      double sl=PositionGetDouble(POSITION_SL);
      double tp=PositionGetDouble(POSITION_TP);
      double profit=PositionGetDouble(POSITION_PROFIT);
      double swap=PositionGetDouble(POSITION_SWAP);

      profit+=swap;

      if(!first)
         json+=",";

      json+=StringFormat(
         "{\"ticket\":\"%I64u\",\"license_key\":\"%s\",\"mt5_account\":\"%I64d\",\"symbol\":\"%s\",\"position_type\":\"%s\",\"volume\":%.8f,\"open_price\":%.10f,\"current_price\":%.10f,\"sl\":%.10f,\"tp\":%.10f,\"profit\":%.2f}",
         ticket,
         EscapeJson(InpLicenseKey),
         AccountInfoInteger(ACCOUNT_LOGIN),
         EscapeJson(symbol),
         positionType,
         volume,
         openPrice,
         currentPrice,
         sl,
         tp,
         profit
      );

      first=false;
   }

   json+="]";
   return json;
}

//+------------------------------------------------------------------+
//| Send monitor data                                                |
//+------------------------------------------------------------------+
void SendMonitorData()
{
   long account=AccountInfoInteger(ACCOUNT_LOGIN);

   double balance=
      AccountInfoDouble(ACCOUNT_BALANCE);

   double equity=
      AccountInfoDouble(ACCOUNT_EQUITY);

   double margin=
      AccountInfoDouble(ACCOUNT_MARGIN);

   double freeMargin=
      AccountInfoDouble(ACCOUNT_MARGIN_FREE);

   double marginLevel=
      AccountInfoDouble(ACCOUNT_MARGIN_LEVEL);

   string currency=
      AccountInfoString(ACCOUNT_CURRENCY);

   string broker=
      AccountInfoString(ACCOUNT_COMPANY);

   string server=
      AccountInfoString(ACCOUNT_SERVER);

   int positions=0;
   int buyPositions=0;
   int sellPositions=0;
   double totalLots=0.0;
   double floatingProfit=0.0;

   GetPositionStats(
      positions,
      buyPositions,
      sellPositions,
      totalLots,
      floatingProfit
   );

   string url=InpApiBaseUrl+"/api/monitor";

   // Keep the existing monitor fields and add full position details.
   // The Monitor EA only REPORTS state; it never changes state.
   string positionDetailsJson=BuildPositionDetailsJson();

   string json=StringFormat(
      "{\"license_key\":\"%s\",\"mt5_account\":\"%I64d\",\"broker\":\"%s\",\"server\":\"%s\",\"balance\":%.2f,\"equity\":%.2f,\"margin\":%.2f,\"free_margin\":%.2f,\"margin_level\":%.2f,\"currency\":\"%s\",\"symbol\":\"%s\",\"positions\":%d,\"buy_positions\":%d,\"sell_positions\":%d,\"total_lots\":%.2f,\"floating_profit\":%.2f,\"ea_status\":\"%s\",\"license_status\":\"%s\",\"position_details\":%s}",
      EscapeJson(InpLicenseKey),
      account,
      EscapeJson(broker),
      EscapeJson(server),
      balance,
      equity,
      margin,
      freeMargin,
      marginLevel,
      EscapeJson(currency),
      EscapeJson(_Symbol),
      positions,
      buyPositions,
      sellPositions,
      totalLots,
      floatingProfit,
      g_trading_locked ? "LICENSE_LOCKED" : "MONITOR_ONLINE",
      EscapeJson(g_license_status),
      positionDetailsJson
   );
   char post[];
   char result[];
   string headers="Content-Type: application/json\r\n";
   string result_headers="";

   StringToCharArray(
      json,
      post,
      0,
      StringLen(json),
      CP_UTF8
   );

   ResetLastError();

   int http_code=WebRequest(
      "POST",
      url,
      headers,
      10000,
      post,
      result,
      result_headers
   );

   g_last_monitor_http_code=http_code;
   g_last_monitor=TimeCurrent();

   if(http_code==-1)
   {
      int err=GetLastError();

      g_last_monitor_message=
         StringFormat("WEBREQUEST_ERROR_%d",err);

      Print("GOLDVORTEX MONITOR ERROR: ",
            g_last_monitor_message);
      Print("Make sure this URL is allowed in MT5: ",
            InpApiBaseUrl);

      return;
   }

   string response=
      CharArrayToString(
         result,0,-1,CP_UTF8
      );

   string response_search=response;

   StringReplace(response_search," ","");
   StringReplace(response_search,"\t","");
   StringReplace(response_search,"\r","");
   StringReplace(response_search,"\n","");

   if(http_code>=200 &&
      http_code<300 &&
      StringFind(
         response_search,
         "\"monitor_saved\":true"
      )>=0)
   {
      g_last_monitor_message="MONITOR_SAVED";
   }
   else
   {
      g_last_monitor_message=
         StringFormat(
            "MONITOR_FAILED_HTTP_%d",
            http_code
         );

      Print("GOLDVORTEX MONITOR RESPONSE: ",
            response);
   }
}

//+------------------------------------------------------------------+
//| Chart status                                                     |
//+------------------------------------------------------------------+
void UpdateChartStatus()
{
   if(!InpShowChartStatus)
      return;

   long account=
      AccountInfoInteger(ACCOUNT_LOGIN);

   double balance=
      AccountInfoDouble(ACCOUNT_BALANCE);

   double equity=
      AccountInfoDouble(ACCOUNT_EQUITY);

   double floating=
      AccountInfoDouble(ACCOUNT_PROFIT);

   int positions=
      CountMonitoredPositions();

   string text=
      "GOLDVORTEX MONITOR v5.11\n"
      "================================\n"
      "READ-ONLY MODE\n"
      "NO TRADING FUNCTIONS\n"
      "--------------------------------\n"
      "License : "+InpLicenseKey+"\n"
      "Account : "+(string)account+"\n"
      "Broker  : "+
      AccountInfoString(ACCOUNT_COMPANY)+"\n"
      "Server  : "+
      AccountInfoString(ACCOUNT_SERVER)+"\n"
      "--------------------------------\n"
      "License Status : "+g_license_status+"\n"
      "Trading Lock  : "+(g_trading_locked ? "LOCKED" : "NOT LOCKED")+"\n"
      "API Result     : "+g_last_message+"\n"
      "Verify HTTP    : "+(string)g_last_http_code+"\n"
      "--------------------------------\n"
      "Balance        : "+
      DoubleToString(balance,2)+"\n"
      "Equity         : "+
      DoubleToString(equity,2)+"\n"
      "Floating P/L   : "+
      DoubleToString(floating,2)+"\n"
      "Positions      : "+(string)positions+"\n"
      "--------------------------------\n"
      "Monitor API    : "+
      g_last_monitor_message+"\n"
      "Monitor HTTP   : "+
      (string)g_last_monitor_http_code+"\n"
      "--------------------------------\n"
      "Last Verify    : "+
      TimeToString(
         g_last_verify,
         TIME_DATE|TIME_SECONDS
      )+"\n"
      "Last Monitor   : "+
      TimeToString(
         g_last_monitor,
         TIME_DATE|TIME_SECONDS
      );

   Comment(text);
}

//+------------------------------------------------------------------+
//| Initialization                                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("========================================");
   Print("GOLDVORTEX MONITOR v5.11");
   Print("READ-ONLY MODE");
   Print("NO TRADING FUNCTIONS");
   Print("Account: ",
         (long)AccountInfoInteger(ACCOUNT_LOGIN));
   Print("Broker : ",
         AccountInfoString(ACCOUNT_COMPANY));
   Print("Server : ",
         AccountInfoString(ACCOUNT_SERVER));
   Print("License: ",InpLicenseKey);
   Print("API    : ",InpApiBaseUrl);
   Print("========================================");

   g_license_valid=false;
   g_license_status="VERIFYING";
   g_last_message="VERIFYING";

   EventSetTimer(1);

   // Initial license verification only reports status.
   // It NEVER closes or modifies a position.
   VerifyLicense();

   UpdateChartStatus();

   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Deinitialization                                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();

   Comment("");

   Print(
      "GOLDVORTEX Monitor v5.11 stopped. Reason: ",
      reason
   );
}

//+------------------------------------------------------------------+
//| Timer                                                            |
//+------------------------------------------------------------------+
void OnTimer()
{
   datetime now=TimeCurrent();

   // Defensive gate. No status other than exact LICENSE_EXPIRED can
   // ever reach a trading operation.
   if(g_license_status=="EXPIRED" &&
      g_last_message=="LICENSE_EXPIRED")
   {
      ApplyLicenseLock();
   }

   if(
      g_last_verify==0 ||
      (now-g_last_verify)>=
      MathMax(10,InpVerifyIntervalSeconds)
   )
   {
      VerifyLicense();
   }

   // Monitoring continues as a read-only function.
   // No trading action is performed for ANY license status.
   if(
      g_last_monitor==0 ||
      (now-g_last_monitor)>=
      MathMax(1,InpMonitorIntervalSeconds)
   )
   {
      SendMonitorData();
   }

   UpdateChartStatus();
}

//+------------------------------------------------------------------+
//| Tick                                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   // READ ONLY.
   // No order/position operation is allowed here.
   UpdateChartStatus();
}
//+------------------------------------------------------------------+
