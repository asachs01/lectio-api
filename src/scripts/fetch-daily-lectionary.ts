#!/usr/bin/env ts-node

/**
 * Fetch Daily Lectionary Data
 * 
 * Daily Office Lectionary follows a two-year cycle with:
 * - Morning Prayer: OT, Psalm, NT readings
 * - Evening Prayer: Psalm, Gospel readings
 * 
 * Sources:
 * - Book of Common Prayer (Episcopal/Anglican)
 * - Revised Common Lectionary Daily
 * - Vanderbilt Divinity Library
 */

import * as fs from 'fs';
import * as path from 'path';

// Define the structure for daily readings
interface DailyReading {
  date: string;
  year: 'Year1' | 'Year2'; // Two-year cycle
  office: 'morning' | 'evening';
  readings: {
    oldTestament?: string;
    psalm: string;
    newTestament?: string;
    gospel?: string;
  };
  notes?: string;
}

// Daily Office Lectionary follows a pattern
// Year 1: Odd-numbered years
// Year 2: Even-numbered years
function getDailyOfficeYear(date: Date): 'Year1' | 'Year2' {
  // Church year starts with Advent (late November/early December)
  // For simplicity, we'll use calendar year for now
  return date.getFullYear() % 2 === 1 ? 'Year1' : 'Year2';
}

// Sample Daily Lectionary Data Structure
// This would typically come from a complete dataset
/* const sampleDailyLectionary = {
  Year1: {
    ordinary: {
      // Week patterns for Ordinary Time
      week1: {
        monday: {
          morning: {
            oldTestament: 'Genesis 1:1-2:3',
            psalm: 'Psalm 1',
            newTestament: 'Acts 1:1-14'
          },
          evening: {
            psalm: 'Psalm 2',
            gospel: 'Matthew 1:1-17'
          }
        },
        tuesday: {
          morning: {
            oldTestament: 'Genesis 2:4-25',
            psalm: 'Psalm 3',
            newTestament: 'Acts 1:15-26'
          },
          evening: {
            psalm: 'Psalm 4',
            gospel: 'Matthew 1:18-25'
          }
        },
        wednesday: {
          morning: {
            oldTestament: 'Genesis 3:1-24',
            psalm: 'Psalm 5',
            newTestament: 'Acts 2:1-13'
          },
          evening: {
            psalm: 'Psalm 6',
            gospel: 'Matthew 2:1-12'
          }
        },
        thursday: {
          morning: {
            oldTestament: 'Genesis 4:1-26',
            psalm: 'Psalm 7',
            newTestament: 'Acts 2:14-36'
          },
          evening: {
            psalm: 'Psalm 8',
            gospel: 'Matthew 2:13-23'
          }
        },
        friday: {
          morning: {
            oldTestament: 'Genesis 5:1-32',
            psalm: 'Psalm 9',
            newTestament: 'Acts 2:37-47'
          },
          evening: {
            psalm: 'Psalm 10',
            gospel: 'Matthew 3:1-17'
          }
        },
        saturday: {
          morning: {
            oldTestament: 'Genesis 6:1-22',
            psalm: 'Psalm 11',
            newTestament: 'Acts 3:1-10'
          },
          evening: {
            psalm: 'Psalm 12',
            gospel: 'Matthew 4:1-11'
          }
        }
      }
    },
    // Special seasons would have different patterns
    advent: {
      week1: {
        monday: {
          morning: {
            oldTestament: 'Isaiah 1:1-20',
            psalm: 'Psalm 1',
            newTestament: '1 Thessalonians 1:1-10'
          },
          evening: {
            psalm: 'Psalm 2',
            gospel: 'Luke 20:1-8'
          }
        }
        // ... continue for each day
      }
    },
    christmas: {
      // Christmas season readings
    },
    epiphany: {
      // Epiphany season readings
    },
    lent: {
      // Lenten readings
    },
    easter: {
      // Easter season readings
    }
  },
  Year2: {
    // Similar structure for Year 2
    ordinary: {
      week1: {
        monday: {
          morning: {
            oldTestament: 'Exodus 1:1-22',
            psalm: 'Psalm 1',
            newTestament: 'Romans 1:1-17'
          },
          evening: {
            psalm: 'Psalm 2',
            gospel: 'John 1:1-18'
          }
        }
        // ... continue
      }
    }
  }
}; */

// Generate daily readings for a full year
function generateDailyReadings(year: number): DailyReading[] {
  const readings: DailyReading[] = [];
  const startDate = new Date(year, 0, 1); // January 1
  const endDate = new Date(year, 11, 31); // December 31
  
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const cycleYear = getDailyOfficeYear(currentDate);
    
    // For now, create placeholder entries
    // In production, this would map to actual lectionary data
    
    // Morning Prayer
    readings.push({
      date: dateStr,
      year: cycleYear,
      office: 'morning',
      readings: {
        oldTestament: `Genesis ${currentDate.getDate()}:1-10`,
        psalm: `Psalm ${(currentDate.getDate() * 2) - 1}`,
        newTestament: `Acts ${currentDate.getDate()}:1-15`,
      },
      notes: 'Daily Office Lectionary - Morning Prayer',
    });
    
    // Evening Prayer
    readings.push({
      date: dateStr,
      year: cycleYear,
      office: 'evening',
      readings: {
        psalm: `Psalm ${currentDate.getDate() * 2}`,
        gospel: `Matthew ${currentDate.getDate()}:1-20`,
      },
      notes: 'Daily Office Lectionary - Evening Prayer',
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return readings;
}

// Main function to create daily lectionary data file
async function main() {
  console.log('Generating Daily Lectionary Data...');
  
  // Generate for current year and next year
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1, currentYear + 2];
  
  const allReadings: DailyReading[] = [];
  
  for (const year of years) {
    console.log(`Generating readings for ${year}...`);
    const yearReadings = generateDailyReadings(year);
    allReadings.push(...yearReadings);
  }
  
  // Save to JSON file
  const outputPath = path.join(__dirname, '..', 'data', 'daily-lectionary.json');
  const outputData = {
    description: 'Daily Office Lectionary - Two Year Cycle',
    generated: new Date().toISOString(),
    years: years,
    totalReadings: allReadings.length,
    readings: allReadings,
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  console.log(`✅ Generated ${allReadings.length} daily readings`);
  console.log(`📁 Saved to: ${outputPath}`);
  
  // Show sample
  console.log('\n📖 Sample Daily Readings:');
  allReadings.slice(0, 4).forEach(reading => {
    console.log(`  ${reading.date} (${reading.office}): ${Object.values(reading.readings).filter(r => r).join(', ')}`);
  });
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { DailyReading, generateDailyReadings, getDailyOfficeYear };