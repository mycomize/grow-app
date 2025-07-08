## Brief overview

Guidelines for applying mushroom cultivation expertise when developing features for the mycomize grow management application, ensuring technical implementations align with real-world cultivation practices and requirements.

## Cultivation stage understanding

- Apply knowledge of standard mushroom cultivation lifecycle: inoculation → spawn colonization → bulk substrate colonization → fruiting → harvest
- Understand that each stage has specific environmental requirements (temperature, humidity, air exchange, lighting)
- Recognize that timing between stages varies by species and environmental conditions
- Implement stage transitions that reflect realistic cultivation timelines and dependencies
- Account for potential contamination risks and failure points at each stage

## Environmental monitoring requirements

- Temperature and humidity are critical parameters that need continuous monitoring
- Air exchange (fresh air exchange rate) becomes crucial during fruiting stage
- CO2 levels need to be managed differently across stages (high during colonization, low during fruiting)
- Light requirements change from minimal during colonization to specific photoperiods during fruiting
- Ensure IoT sensor data collection aligns with these biological requirements

## Species-specific considerations

- Different mushroom species have varying optimal conditions and growth patterns
- Substrate requirements differ significantly between species (grain spawn, bulk substrates)
- Harvest timing and techniques vary by species and intended use
- Account for species-specific contamination risks and prevention methods
- Implement flexible parameter ranges that accommodate different cultivation approaches

## Cultivation techniques and methods

- Support various cultivation methods (monotub, shotgun fruiting chamber, automated systems)
- Understand substrate preparation and sterilization requirements
- Account for different inoculation methods (liquid culture, spore syringes, agar transfers)
- Recognize importance of sterile technique throughout the process
- Support both commercial and hobbyist cultivation scales

## Data tracking and analysis

- Focus on metrics that matter for cultivation success: contamination rates, yield per flush, time to harvest
- Track cost-effectiveness including substrate costs, energy consumption, and labor time
- Monitor environmental parameter stability and deviations that could impact success
- Implement alerts for conditions that could lead to contamination or crop failure
- Support harvest tracking across multiple flushes from the same substrate

## Problem diagnosis and troubleshooting

- Help identify common cultivation problems from environmental data patterns
- Understand visual indicators of healthy vs. problematic growth
- Recognize contamination signs and appropriate response measures
- Support decision-making for when to continue vs. abort a grow
- Provide guidance based on symptom patterns and environmental history
