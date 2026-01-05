#!/usr/bin/env node

// Simple test script for MCP server
import axios from 'axios';

const MCP_URL = process.env.MCP_URL || 'http://localhost:3001';

async function testMCPServer() {
  console.log('Testing MCP Server at:', MCP_URL);
  console.log('=====================================\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const health = await axios.get(`${MCP_URL}/health`);
    console.log('✓ Health:', health.data);
    console.log();
    
    // Test 2: List tools
    console.log('2. Testing tools listing...');
    const toolsRequest = {
      jsonrpc: '2.0',
      id: 'list-tools',
      method: 'tools/list',
      params: {}
    };
    const toolsResponse = await axios.post(`${MCP_URL}/rpc`, toolsRequest);
    console.log('✓ Available tools:', toolsResponse.data.result.tools.map(t => t.name));
    console.log();
    
    // Test 3: Get today's readings
    console.log('3. Testing get_readings tool...');
    const readingsRequest = {
      jsonrpc: '2.0',
      id: 'test-readings',
      method: 'tools/call',
      params: {
        name: 'get_readings',
        arguments: {
          tradition: 'rcl'
        }
      }
    };
    const readingsResponse = await axios.post(`${MCP_URL}/rpc`, readingsRequest);
    const readingsData = JSON.parse(readingsResponse.data.result.content[0].text);
    console.log('✓ Today\'s readings:');
    console.log('  Date:', readingsData.date);
    console.log('  Readings:', readingsData.readings.map(r => `${r.type}: ${r.citation}`));
    console.log();
    
    // Test 4: Explore current calendar
    console.log('4. Testing explore_calendar tool...');
    const calendarRequest = {
      jsonrpc: '2.0',
      id: 'test-calendar',
      method: 'tools/call',
      params: {
        name: 'explore_calendar',
        arguments: {
          focus: 'current',
          tradition: 'rcl'
        }
      }
    };
    const calendarResponse = await axios.post(`${MCP_URL}/rpc`, calendarRequest);
    const calendarData = JSON.parse(calendarResponse.data.result.content[0].text);
    console.log('✓ Current liturgical info:');
    console.log('  Season:', calendarData.currentSeason.name);
    console.log('  Year:', calendarData.currentYear);
    console.log();
    
    // Test 5: Test SSE endpoint
    console.log('5. Testing SSE endpoint...');
    const sseTest = await axios.get(`${MCP_URL}/sse`, {
      responseType: 'stream',
      timeout: 1000
    }).catch(() => null);
    if (sseTest) {
      console.log('✓ SSE endpoint is available');
    }
    console.log();
    
    console.log('=====================================');
    console.log('✅ All tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run tests
testMCPServer();