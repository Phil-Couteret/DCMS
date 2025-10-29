import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  AccessTime as TimeIcon, 
  Water as DepthIcon, 
  ExpandMore as ExpandMoreIcon,
  Waves as WavesIcon,
  Speed as CurrentIcon
} from '@mui/icons-material';

const DiveSites = () => {
  const [tabValue, setTabValue] = React.useState(0);

  const caletaSites = [
    // Castillo Reef Sites
    {
      reef: 'Castillo Reef',
      name: 'Anfiteatro',
      type: 'Reef',
      depthRange: '12-21m',
      difficulty: 'Beginner',
      current: 'Little - Medium',
      waves: 'Unprotected',
      travelTime: '5-10 min',
      description: 'Among the overhanging rocks along the whole reef are scorpion fish, grouperfish, trumpet fish and greater silver smelt. At a depth of about 12 meters, barracudas are waiting for their prey, while curious amber jacks eye the divers closely from nearby.'
    },
    {
      reef: 'Castillo Reef',
      name: 'Barranco',
      type: 'Reef',
      depthRange: '12-23m',
      difficulty: 'Beginner',
      current: 'Little - Medium',
      waves: 'Unprotected',
      travelTime: '5-10 min',
      description: 'A beautiful reef with overhangs and columns. Swarms of striped breams, zebra breams and yellow-finned mackerel are also found here. In the columns and holes different moray species have made their homes; Tiger morays, Duke Augustus morays and large masked morays are not a rarity here.'
    },
    {
      reef: 'Castillo Reef',
      name: 'Fortaleza',
      type: 'Reef',
      depthRange: '3-24m',
      difficulty: 'Beginner',
      current: 'Little - Medium',
      waves: 'Unprotected',
      travelTime: '3-8 min',
      description: 'A rocky wall, which rises vertically up from the sloping sea floor between 18 and 12 meters deep, to 3 meters below the surface. Around this dive site you will find a lot of wreck debris, which is testimony to the fact that these reefs have proved to be a disaster for many ships.'
    },
    {
      reef: 'Castillo Reef',
      name: 'Mole (cementerio de barco)',
      type: 'Reef',
      depthRange: '7m',
      difficulty: 'Beginner',
      current: 'Very Little',
      waves: 'Protected',
      travelTime: '2 min',
      description: 'Here you are in the kindergarten of the Atlantic. In addition to swarms of young barracudas, striped bream and sardines there are always octopus and squid on site, sometimes you can also find the odd seahorse. In the winter months angel sharks make the spot their own.'
    },
    
    // Salinas Reef Sites
    {
      reef: 'Salinas Reef',
      name: 'La Emboscada',
      type: 'Reef',
      depthRange: '7-40m',
      difficulty: 'Beginner',
      current: 'Moderate - Strong (drift)',
      waves: 'Unprotected',
      travelTime: '15-20 min',
      description: 'This dive site above the reef is very close to the coast. The beautiful underwater landscape with impressive rock formations, the possibilities to swim through them and the great depth differences make every dive here very variable.'
    },
    {
      reef: 'Salinas Reef',
      name: 'Camino de altura',
      type: 'Reef',
      depthRange: '7-40m',
      difficulty: 'Beginner',
      current: 'Moderate',
      waves: 'Unprotected',
      travelTime: '15-20 min',
      description: 'Here you will find some very nice swim throughs outside the reef. Close to the big wall there are a few cool overhangs, in which groupers feel comfortable. Larger fish such as tuna, bonito, yellowtail mackerel are also common in this area.'
    },
    {
      reef: 'Salinas Reef',
      name: 'El Muellito',
      type: 'Reef',
      depthRange: '7-40m',
      difficulty: 'Beginner',
      current: 'Moderate - Strong',
      waves: 'Unprotected',
      travelTime: '10-15 min',
      description: 'The reef begins here at a depth of 7 meters and thus offers the escaping sardines protection from hunting amber jacks and blue perch. At a depth of 23 meters there is a wildly rugged gorge that can be dived to a length of about 12 meters.'
    },
    {
      reef: 'Salinas Reef',
      name: 'El Tazar',
      type: 'Reef',
      depthRange: '12-35m',
      difficulty: 'Beginner',
      current: 'Moderate',
      waves: 'Unprotected',
      travelTime: '10-15 min',
      description: 'Huge swarms of monkfish are often found here on the reef\'s edge. A little further into the deep blue depths swarms of large barracudas can be found circling. A bit deeper between the rock formations you can find, for example, grouper, parrotfish, sea bass and yard eels.'
    },
    {
      reef: 'Salinas Reef',
      name: 'Tesoro negro',
      type: 'Reef',
      depthRange: '12-30m',
      difficulty: 'Advanced',
      current: 'Moderate',
      waves: 'Unprotected',
      travelTime: '10-15 min',
      description: 'Dark and mysterious. The name of the dive site is fitting: bizarre black corals grow on the reef walls. The wall is home to very beautiful sponges, anemones and nudibranches. At the foot of the wall under the overhangs you can see fields of peacock feathers and cylinder roses.'
    },
    {
      reef: 'Salinas Reef',
      name: 'El Portal',
      type: 'Reef',
      depthRange: '12-35m',
      difficulty: 'Advanced',
      current: 'Moderate',
      waves: 'Unprotected',
      travelTime: '10-15 min',
      description: 'The rocky wall with a swim through leading out into the deep blue depths is a little bit in front of the reef itself. Here one has the best views to see big fish: from tuna fish with a length of 2 meters to swarms of big amber jacks which are up to 1.80 meters long and up to the whale sharks with their cute spots.'
    },
    {
      reef: 'Salinas Reef',
      name: 'El Mirador',
      type: 'Reef',
      depthRange: '12-38m',
      difficulty: 'Advanced',
      current: 'Moderate',
      waves: 'Unprotected',
      travelTime: '10-15 min',
      description: 'We must first cross a ravine here in order to arrive at a somewhat advanced rock formation. Here, with the view into the deep blue, swarms of bonitos and amber jacks pass by. Between the rocks the eagle ray rests and floats in search of food.'
    },
    {
      reef: 'Salinas Reef',
      name: 'El Laberinto',
      type: 'Reef',
      depthRange: '12-38m',
      difficulty: 'Advanced',
      current: 'Moderate',
      waves: 'Unprotected',
      travelTime: '10-15 min',
      description: 'The name says it all: the labyrinth is a wild underwater landscape, which is still surprising after many dives. Barracuda, bonito, angel sharks and can be seen here. At the edge of the reef there are usually huge swarms of sardines, which are hunted and chased by tuna.'
    },
    {
      reef: 'Salinas Reef',
      name: 'La Pirámide',
      type: 'Reef',
      depthRange: '14-39m',
      difficulty: 'Advanced',
      current: 'Moderate - Strong',
      waves: 'Unprotected',
      travelTime: '10-15 min',
      description: 'A fight between teenagers is not a rarity here: Behind the reef\'s edge at a depth of about 26 meters, a whole band of half-grown groupers is waiting between the rocks to tussle with free swimming morays. Close to the pyramid you sometimes meet sea turtles who are in search of food.'
    },
    {
      reef: 'Salinas Reef',
      name: 'El Monasterio',
      type: 'Reef',
      depthRange: '14-36m',
      difficulty: 'Advanced',
      current: 'Moderate',
      waves: 'Unprotected',
      travelTime: '10-15 min',
      description: 'A whole labyrinth of rocky gorges awaits you behind the reef\'s edge. They remind us of the narrow walls of a monastery. Between the rocks you can find stately octopuses and large sepias. In front of the rocky passages on the bright sandy bottom, various rays search for food.'
    },
    
    // Nuevo Horizonte Reef Sites
    {
      reef: 'Nuevo Horizonte Reef',
      name: 'Nuevo Horizonte',
      type: 'Reef',
      depthRange: '24-39m',
      difficulty: 'Advanced',
      current: 'Moderate - Strong (drift)',
      waves: 'Unprotected',
      travelTime: '15-20 min',
      description: 'Nuevo Horizonte, vor Costa Caleta (Caleta de la Camella). Large fish such as tuna, bonito, amber jacks and barracudas are regularly sighted here. Doradas, Badis, Barracudas and Tuna come curiously towards the reef. In February and March, a lot of angel sharks come here to mate.'
    }
  ];

  const playitasSites = [
    {
      name: 'Las Playitas Reef',
      type: 'Reef',
      maxDepth: '18m',
      difficulty: 'Beginner',
      duration: '45-60 min',
      description: 'Stunning reef perfect for beginners'
    }
  ];

  const SiteCard = ({ site }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom color="primary">
          {site.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {site.reef}
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Chip label={site.type} size="small" sx={{ mr: 1 }} />
          <Chip 
            label={site.difficulty} 
            size="small" 
            color={site.difficulty === 'Advanced' ? 'error' : site.difficulty === 'Intermediate' ? 'warning' : 'success'} 
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <DepthIcon sx={{ mr: 1, fontSize: 20 }} />
          <Typography variant="body2">Depth: {site.depthRange}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <CurrentIcon sx={{ mr: 1, fontSize: 20 }} />
          <Typography variant="body2">Current: {site.current}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <WavesIcon sx={{ mr: 1, fontSize: 20 }} />
          <Typography variant="body2">Waves: {site.waves}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TimeIcon sx={{ mr: 1, fontSize: 20 }} />
          <Typography variant="body2">Travel: {site.travelTime}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {site.description}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h3" gutterBottom>
        Our Dive Sites
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Caleta de Fuste" />
          <Tab label="Las Playitas" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Box>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            Caleta de Fuste Dive Sites
          </Typography>
          <Typography variant="body1" paragraph color="text.secondary">
            Discover the stunning reefs and diverse marine life of Caleta de Fuste. 
            From beginner-friendly sites to advanced challenges, there's something for everyone.
          </Typography>
          
          {/* Group sites by reef */}
          {['Castillo Reef', 'Salinas Reef', 'Nuevo Horizonte Reef'].map((reefName) => {
            const reefSites = caletaSites.filter(site => site.reef === reefName);
            return (
              <Accordion key={reefName} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    {reefName} ({reefSites.length} sites)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    {reefSites.map((site, index) => (
                      <Grid item xs={12} md={6} lg={4} key={index}>
                        <SiteCard site={site} />
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            Las Playitas Dive Sites
          </Typography>
          <Typography variant="body1" paragraph color="text.secondary">
            The Las Playitas location offers excellent diving conditions with crystal clear waters 
            and abundant marine life.
          </Typography>
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {playitasSites.map((site, index) => (
              <Grid item xs={12} md={6} key={index}>
                <SiteCard site={site} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Container>
  );
};

export default DiveSites;

